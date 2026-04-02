/**
 * scheduler.js
 *
 * In-process cron jobs using node-cron.
 * Called once from server.js after the DB connects.
 *
 * Install dependency (run once on your VPS):
 *   npm install node-cron
 */

import cron from 'node-cron';
import prisma from '../config/database.js';
import { sendReminderEmail } from './sendEmail.js';
import { sendViaBusiness } from './sendSMS.js';

// ---------------------------------------------------------------------------
// Helper: send reminder via email + SMS if Arkesel is configured
// ---------------------------------------------------------------------------
async function sendReminderMultiChannel({ email, phone, customerName, type, businessId, message }) {
  // Email (always attempt if email present)
  if (email) {
    const settings = await prisma.businessSettings.findFirst({
      where: { businessId },
      select: { name: true, email: true, arkeselSenderId: true, arkeselWhatsAppSenderId: true },
    });
    const businessName = settings?.name || 'Gray Manager';
    await sendReminderEmail(email, { customerName, type, businessName, businessEmail: settings?.email || null, message });

    // SMS (if Arkesel configured and phone present)
    if (phone && process.env.ARKESEL_API_KEY && settings?.arkeselSenderId) {
      const config = { apiKey: process.env.ARKESEL_API_KEY, arkeselSenderId: settings.arkeselSenderId, arkeselWhatsAppSenderId: settings.arkeselWhatsAppSenderId, whatsappStatus: settings.whatsappStatus };
      await sendViaBusiness(phone, message || getDefaultSMSMessage(type, customerName, businessName), 'sms', config).catch(() => {});
    }
  }
}

function getDefaultSMSMessage(type, customerName, businessName) {
  const messages = {
    post_job: `Hi ${customerName}, how has your car been since the service? We hope all is well. - ${businessName}`,
    post_job_week: `Hi ${customerName}, it's been a week since your service. How is your car doing? - ${businessName}`,
    service_due: `Hi ${customerName}, your vehicle is due for a service check. Contact us to book. - ${businessName}`,
    invoice_overdue: `Hi ${customerName}, you have an outstanding payment due. Please contact ${businessName} to settle.`,
    follow_up: `Hi ${customerName}, just following up on your recent job with us. Any issues? - ${businessName}`,
    oil_coolant_change: `Hi ${customerName}, reminder: your vehicle is due for an oil/coolant change. - ${businessName}`,
    general_check: `Hi ${customerName}, it's time for a general vehicle check-up. Book with ${businessName} today.`,
    how_was_job: `Hi ${customerName}, how was your recent service experience at ${businessName}? We value your feedback.`,
    manual: `Message from ${businessName}: Hi ${customerName}.`,
  };
  return messages[type] || messages.manual;
}

// ---------------------------------------------------------------------------
// Helper: delete all data for a sandbox business in FK-safe order
// ---------------------------------------------------------------------------
async function deleteSandboxData(businessId) {
  // Prisma interactive transactions have a default 5s timeout —
  // use $transaction with an extended timeout for large deletes.
  await prisma.$transaction(
    async (tx) => {
      await tx.receipt.deleteMany({ where: { businessId } });
      await tx.payment.deleteMany({ where: { businessId } });
      await tx.invoice.deleteMany({ where: { businessId } });
      await tx.jobMaterial.deleteMany({ where: { businessId } });
      await tx.job.deleteMany({ where: { businessId } });
      await tx.saleItem.deleteMany({ where: { businessId } });
      await tx.sale.deleteMany({ where: { businessId } });
      await tx.materialReorder.deleteMany({ where: { businessId } });
      await tx.materialUnit.deleteMany({ where: { businessId } });
      await tx.material.deleteMany({ where: { businessId } });
      await tx.globalUnit.deleteMany({ where: { businessId } });
      await tx.service.deleteMany({ where: { businessId } });
      await tx.expense.deleteMany({ where: { businessId } });
      await tx.customer.deleteMany({ where: { businessId } });
      await tx.booking.deleteMany({ where: { businessId } });
      await tx.auditLog.deleteMany({ where: { businessId } });
      await tx.businessSettings.deleteMany({ where: { businessId } });
      await tx.user.deleteMany({ where: { businessId } });
      await tx.business.delete({ where: { id: businessId } });
    },
    { timeout: 30_000 } // 30 second timeout for large sandboxes
  );
}

// ---------------------------------------------------------------------------
// Core cleanup task
// ---------------------------------------------------------------------------
async function runSandboxCleanup() {
  const label = `[SANDBOX CRON ${new Date().toISOString()}]`;

  try {
    // Find all expired sandbox workspaces
    // Sandboxes are identified by plan='sandbox', and expiry is stored
    // in paymentGatewayId as an ISO timestamp string.
    const allSandboxes = await prisma.business.findMany({
      where: {
        plan: 'sandbox',
        paymentGatewayProvider: 'sandbox',
      },
      select: { id: true, name: true, paymentGatewayId: true },
    });

    const now = new Date();
    const expired = allSandboxes.filter((b) => {
      if (!b.paymentGatewayId) return true; // no expiry set → treat as expired
      return now > new Date(b.paymentGatewayId);
    });

    if (expired.length === 0) {
      console.log(`${label} No expired sandboxes found. Active sandboxes: ${allSandboxes.length}`);
      return;
    }

    console.log(`${label} Found ${expired.length} expired sandbox(es) to delete.`);

    let deleted = 0;
    let failed = 0;

    for (const sandbox of expired) {
      try {
        await deleteSandboxData(sandbox.id);
        deleted++;
        console.log(`${label} ✅ Deleted sandbox: ${sandbox.id}`);
      } catch (err) {
        failed++;
        console.error(`${label} ❌ Failed to delete sandbox ${sandbox.id}:`, err.message);
      }
    }

    console.log(`${label} Cleanup complete. Deleted: ${deleted}, Failed: ${failed}`);
  } catch (err) {
    // Never let a cron error crash the server
    console.error(`${label} Unexpected error during cleanup:`, err.message);
  }
}

// ---------------------------------------------------------------------------
// Register all cron jobs and start them
// ---------------------------------------------------------------------------
export function startScheduler() {
  // ── Sandbox cleanup ──────────────────────────────────────────────────────
  // Runs every hour at :00  →  cron expression: '0 * * * *'
  // Change to '*/30 * * * *' for every 30 minutes if you want faster cleanup.
  cron.schedule('0 * * * *', runSandboxCleanup, {
    timezone: 'Africa/Accra', // match your business timezone
  });

  console.log('⏰ Scheduler started — sandbox cleanup runs every hour.');

  // Run once immediately at startup to catch anything that expired while
  // the server was offline (e.g. after a VPS reboot).
  runSandboxCleanup();

  // ── Post-job follow-up ──────────────────────────────────────────────────
  // Runs daily at 09:00 Africa/Accra. Sends a follow-up email for jobs
  // completed exactly 3 days ago that haven't had a post_job reminder yet.
  cron.schedule('0 9 * * *', async () => {
    const label = `[POST-JOB CRON ${new Date().toISOString()}]`;
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const dayStart = new Date(threeDaysAgo); dayStart.setHours(0, 0, 0, 0);
      const dayEnd   = new Date(threeDaysAgo); dayEnd.setHours(23, 59, 59, 999);

      const jobs = await prisma.job.findMany({
        where: {
          status: 'completed',
          customerId: { not: null },
          createdAt: { gte: dayStart, lte: dayEnd },
        },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true } },
          business: { select: { id: true } },
        },
      });

      for (const job of jobs) {
        if (!job.customer?.email) continue;
        const alreadySent = await prisma.reminder.findFirst({
          where: { jobId: job.id, type: 'post_job' },
        });
        if (alreadySent) continue;

        const customerName = `${job.customer.firstName} ${job.customer.lastName || ''}`.trim();

        await sendReminderMultiChannel({
          email: job.customer?.email,
          phone: job.customer?.phone,
          customerName,
          type: 'post_job',
          businessId: job.businessId,
        });

        await prisma.reminder.create({
          data: {
            businessId: job.businessId,
            customerId: job.customer.id,
            jobId: job.id,
            type: 'post_job',
            channel: 'email',
            status: 'sent',
            scheduledFor: new Date(),
            sentAt: new Date(),
          },
        });

        console.log(`${label} ✅ Post-job reminder sent for job #${job.id}`);
      }
    } catch (err) {
      console.error(`${label} ❌ Error:`, err.message);
    }
  }, { timezone: 'Africa/Accra' });

  // ── Periodic service reminder ───────────────────────────────────────────
  // Runs on the 1st of each month at 10:00. Sends a service-due reminder
  // to customers whose last job was ~90 days ago with no recent reminder.
  cron.schedule('0 10 1 * *', async () => {
    const label = `[SERVICE-DUE CRON ${new Date().toISOString()}]`;
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const windowStart = new Date(ninetyDaysAgo); windowStart.setDate(windowStart.getDate() - 1);
      const windowEnd   = new Date(ninetyDaysAgo); windowEnd.setDate(windowEnd.getDate() + 1);

      // Find customers with a job in the 89-91 day window
      const recentJobs = await prisma.job.findMany({
        where: {
          customerId: { not: null },
          createdAt: { gte: windowStart, lte: windowEnd },
        },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        distinct: ['customerId'],
      });

      for (const job of recentJobs) {
        if (!job.customer?.email) continue;

        // Check no service_due reminder in the last 80 days
        const eighty = new Date(); eighty.setDate(eighty.getDate() - 80);
        const recent = await prisma.reminder.findFirst({
          where: {
            customerId: job.customer.id,
            type: 'service_due',
            createdAt: { gte: eighty },
          },
        });
        if (recent) continue;

        const settings = await prisma.businessSettings.findFirst({
          where: { businessId: job.businessId },
          select: { name: true, email: true },
        });
        const businessName = settings?.name || 'Gray Manager';
        const customerName = `${job.customer.firstName} ${job.customer.lastName || ''}`.trim();

        await prisma.reminder.create({
          data: {
            businessId: job.businessId,
            customerId: job.customer.id,
            jobId: job.id,
            type: 'service_due',
            channel: 'email',
            status: 'pending',
            scheduledFor: new Date(),
          },
        });

        await sendReminderEmail(job.customer.email, { customerName, type: 'service_due', businessName, businessEmail: settings?.email || null });

        await prisma.reminder.updateMany({
          where: { customerId: job.customer.id, type: 'service_due', status: 'pending' },
          data: { status: 'sent', sentAt: new Date() },
        });

        console.log(`${label} ✅ Service-due reminder sent to customer #${job.customer.id}`);
      }
    } catch (err) {
      console.error(`${label} ❌ Error:`, err.message);
    }
  }, { timezone: 'Africa/Accra' });

  // ── Invoice overdue ─────────────────────────────────────────────────────
  // Runs daily at 09:30. Sends payment reminders for invoices unpaid for 7+ days.
  cron.schedule('30 9 * * *', async () => {
    const label = `[INVOICE-OVERDUE CRON ${new Date().toISOString()}]`;
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const overdueInvoices = await prisma.invoice.findMany({
        where: {
          paymentStatus: { in: ['unpaid', 'partial'] },
          invoiceDate: { lte: sevenDaysAgo },
        },
        include: {
          job: {
            select: {
              id: true, businessId: true, clientEmail: true, clientName: true,
              customerId: true,
              customer: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
      });

      for (const invoice of overdueInvoices) {
        const job = invoice.job;
        const email = job.customer?.email || job.clientEmail;
        if (!email) continue;

        // Check no invoice_overdue reminder in the last 7 days for this job
        const recentCheck = new Date(); recentCheck.setDate(recentCheck.getDate() - 7);
        const already = await prisma.reminder.findFirst({
          where: {
            jobId: job.id,
            type: 'invoice_overdue',
            createdAt: { gte: recentCheck },
          },
        });
        if (already) continue;

        const settings = await prisma.businessSettings.findFirst({
          where: { businessId: job.businessId },
          select: { name: true, email: true },
        });
        const businessName = settings?.name || 'Gray Manager';
        const customerId = job.customer?.id || null;
        if (!customerId) continue;

        const customerName = job.customer
          ? `${job.customer.firstName} ${job.customer.lastName || ''}`.trim()
          : job.clientName;

        await prisma.reminder.create({
          data: {
            businessId: job.businessId,
            customerId,
            jobId: job.id,
            type: 'invoice_overdue',
            channel: 'email',
            status: 'pending',
            scheduledFor: new Date(),
          },
        });

        await sendReminderEmail(email, { customerName, type: 'invoice_overdue', businessName, businessEmail: settings?.email || null });

        await prisma.reminder.updateMany({
          where: { jobId: job.id, type: 'invoice_overdue', status: 'pending' },
          data: { status: 'sent', sentAt: new Date() },
        });

        console.log(`${label} ✅ Invoice-overdue reminder sent for invoice #${invoice.id}`);
      }
    } catch (err) {
      console.error(`${label} ❌ Error:`, err.message);
    }
  }, { timezone: 'Africa/Accra' });

  // ── 1-week post-job follow-up ──────────────────────────────────────────
  // Runs daily at 09:15. Sends a "how has it been a week after your service?" message.
  cron.schedule('15 9 * * *', async () => {
    const label = `[POST-JOB-WEEK CRON ${new Date().toISOString()}]`;
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dayStart = new Date(sevenDaysAgo); dayStart.setHours(0, 0, 0, 0);
      const dayEnd   = new Date(sevenDaysAgo); dayEnd.setHours(23, 59, 59, 999);

      const jobs = await prisma.job.findMany({
        where: {
          status: 'completed',
          customerId: { not: null },
          updatedAt: { gte: dayStart, lte: dayEnd },
        },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        },
      });

      for (const job of jobs) {
        const alreadySent = await prisma.reminder.findFirst({
          where: { jobId: job.id, type: 'post_job_week' },
        });
        if (alreadySent) continue;

        const customerName = `${job.customer.firstName} ${job.customer.lastName || ''}`.trim();
        await sendReminderMultiChannel({
          email: job.customer?.email,
          phone: job.customer?.phone,
          customerName,
          type: 'post_job_week',
          businessId: job.businessId,
        });

        await prisma.reminder.create({
          data: {
            businessId: job.businessId,
            customerId: job.customer.id,
            jobId: job.id,
            type: 'post_job_week',
            channel: 'email',
            status: 'sent',
            scheduledFor: new Date(),
            sentAt: new Date(),
          },
        });

        console.log(`${label} ✅ 1-week follow-up sent for job #${job.id}`);
      }
    } catch (err) {
      console.error(`${label} ❌ Error:`, err.message);
    }
  }, { timezone: 'Africa/Accra' });

  // ── Recurring job reminders ──────────────────────────────────────────────
  // Runs daily at 09:45. Processes pending reminders that are due today,
  // sends them, then schedules the next one in the cycle if the job has
  // a reminderIntervalMonths set (i.e. user opted into recurring reminders).
  cron.schedule('45 9 * * *', async () => {
    const label = `[RECURRING-REMINDERS CRON ${new Date().toISOString()}]`;
    try {
      const now = new Date();
      const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);

      const dueReminders = await prisma.reminder.findMany({
        where: {
          status: 'pending',
          scheduledFor: { lte: dayEnd },
          type: { in: ['follow_up', 'oil_coolant_change', 'general_check', 'how_was_job'] },
        },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          job: { select: { id: true, businessId: true, reminderIntervalMonths: true, reminderEnabled: true } },
        },
      });

      for (const reminder of dueReminders) {
        if (!reminder.customer) continue;
        const job = reminder.job;
        const customerName = `${reminder.customer.firstName} ${reminder.customer.lastName || ''}`.trim();

        await sendReminderMultiChannel({
          email: reminder.customer.email,
          phone: reminder.customer.phone,
          customerName,
          type: reminder.type,
          businessId: reminder.businessId,
        });

        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'sent', sentAt: new Date() },
        });

        // Schedule next reminder if job has recurring interval
        if (job?.reminderEnabled && job?.reminderIntervalMonths) {
          const nextDate = new Date(reminder.scheduledFor);
          nextDate.setMonth(nextDate.getMonth() + job.reminderIntervalMonths);

          await prisma.reminder.create({
            data: {
              businessId: reminder.businessId,
              customerId: reminder.customerId,
              jobId: reminder.jobId,
              type: reminder.type,
              channel: reminder.channel,
              status: 'pending',
              scheduledFor: nextDate,
            },
          });
          console.log(`${label} ✅ Sent + rescheduled reminder #${reminder.id} (type: ${reminder.type}), next: ${nextDate.toDateString()}`);
        } else {
          console.log(`${label} ✅ Sent one-time reminder #${reminder.id} (type: ${reminder.type})`);
        }
      }
    } catch (err) {
      console.error(`${label} ❌ Error:`, err.message);
    }
  }, { timezone: 'Africa/Accra' });

  console.log('⏰ Reminder cron jobs registered: post-job (09:00), 1-week follow-up (09:15), service-due (10:00 1st), invoice-overdue (09:30), recurring reminders (09:45).');
}