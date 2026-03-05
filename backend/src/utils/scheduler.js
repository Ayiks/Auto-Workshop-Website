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
}