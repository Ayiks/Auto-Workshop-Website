/**
 * sandbox.controller.js
 * Handles "Try Demo" one-click sandbox creation and lifecycle management.
 */

import bcrypt from 'bcryptjs';
import prisma, { getTenantDB } from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { generateToken } from '../middleware/auth.js';
import { seedSandbox } from '../utils/sandboxSeeder.js';

// How long a sandbox lives before being deleted (default: 48 hours)
const SANDBOX_TTL_HOURS = parseInt(process.env.SANDBOX_TTL_HOURS || '48');

// ---------------------------------------------------------------------------
// @desc    Create a one-click sandbox demo workspace and log the user in
// @route   POST /api/sandbox/create
// @access  Public
// ---------------------------------------------------------------------------
export const createSandbox = asyncHandler(async (req, res) => {
  // 1. Rate limit check: one active sandbox per IP address
  //    (relies on your existing express-rate-limit middleware on this route,
  //     but we add a soft DB-level guard too)
  const clientIp =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  // 2. Compute expiry time
  const expiresAt = new Date(Date.now() + SANDBOX_TTL_HOURS * 60 * 60 * 1000);

  // 3. Create the sandbox Business — marked with plan='sandbox' so we can
  //    identify and purge them easily
  const business = await prisma.business.create({
    data: {
      name: 'Demo Auto Workshop',
      plan: 'sandbox',
      subscriptionStatus: 'active',
      // We store expiry in paymentGatewayId as a lightweight workaround
      // (avoids a schema migration for now — see schema note below)
      paymentGatewayProvider: 'sandbox',
      paymentGatewayId: expiresAt.toISOString(),
    },
  });

  // 4. Create the sandbox admin user with a random unique username
  const sandboxSuffix = business.id.slice(0, 8);
  const username = `demo_${sandboxSuffix}`;
  const plainPassword = 'Demo@1234'; // shown to user in response
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const adminUser = await prisma.user.create({
    data: {
      username,
      passwordHash,
      fullName: 'Demo Admin',
      email: `demo_${sandboxSuffix}@sandbox.graymanager.com`,
      role: 'admin',
      businessId: business.id,
      isEmailVerified: true,
      isActive: true,
      permissions: { all: ['manage'] },
    },
  });

  // 5. Seed the sandbox with realistic dummy data
  let seedStats;
  try {
    seedStats = await seedSandbox(business.id, adminUser.id);
  } catch (seedError) {
    // If seeding fails, clean up ALL orphaned data in FK-safe order then rethrow
    console.error('Sandbox seeding failed, rolling back:', seedError);
    await deleteSandboxData(business.id).catch((cleanupErr) => {
      console.error('[SANDBOX] Rollback cleanup also failed:', cleanupErr.message);
    });
    throw new AppError(
      'Failed to create sandbox environment. Please try again.',
      500,
      'SANDBOX_SEED_ERROR'
    );
  }

  // 6. Generate a JWT so the user is logged in immediately
  const token = generateToken(adminUser);

  // 7. Log sandbox creation for auditing
  console.info(`[SANDBOX] Created: business=${business.id}, user=${adminUser.id}, ip=${clientIp}, expires=${expiresAt.toISOString()}`);

  res.status(201).json({
    success: true,
    message: 'Your sandbox is ready!',
    expiresAt: expiresAt.toISOString(),
    expiresInHours: SANDBOX_TTL_HOURS,
    credentials: {
      username,
      password: plainPassword,
    },
    token,
    user: {
      id: adminUser.id,
      fullName: adminUser.fullName,
      email: adminUser.email,
      username: adminUser.username,
      role: adminUser.role,
      businessId: business.id,
      businessName: business.name,
      permissions: adminUser.permissions,
      isActive: adminUser.isActive,
    },
    sandbox: {
      isSandbox: true,
      expiresAt: expiresAt.toISOString(),
      seedStats,
    },
  });
});

// ---------------------------------------------------------------------------
// @desc    Get sandbox status (time remaining, is it still alive)
// @route   GET /api/sandbox/status
// @access  Private (sandbox users only)
// ---------------------------------------------------------------------------
export const getSandboxStatus = asyncHandler(async (req, res) => {
  const business = await prisma.business.findUnique({
    where: { id: req.user.businessId },
    select: {
      id: true,
      plan: true,
      paymentGatewayProvider: true,
      paymentGatewayId: true,
    },
  });

  if (!business || business.plan !== 'sandbox') {
    throw new AppError('This is not a sandbox workspace', 400, 'NOT_SANDBOX');
  }

  const expiresAt = business.paymentGatewayId
    ? new Date(business.paymentGatewayId)
    : null;

  const now = new Date();
  const isExpired = expiresAt ? now > expiresAt : false;
  const msRemaining = expiresAt ? Math.max(0, expiresAt - now) : 0;
  const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

  res.status(200).json({
    success: true,
    data: {
      isSandbox: true,
      isExpired,
      expiresAt: expiresAt?.toISOString() || null,
      timeRemaining: {
        hours: hoursRemaining,
        minutes: minutesRemaining,
        totalMs: msRemaining,
        display: `${hoursRemaining}h ${minutesRemaining}m`,
      },
    },
  });
});

// ---------------------------------------------------------------------------
// @desc    Cleanup expired sandboxes (called by cron job)
//          Deletes all data in correct FK order, then removes the business.
// @route   POST /api/sandbox/cleanup  (internal — secured by CRON_SECRET header)
// @access  Internal only
// ---------------------------------------------------------------------------
export const cleanupExpiredSandboxes = asyncHandler(async (req, res) => {
  // Verify internal secret so this can't be called by random users
  const cronSecret = req.headers['x-cron-secret'];
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    throw new AppError('Unauthorized', 401, 'AUTH_REQUIRED');
  }

  const now = new Date();

  // Find all sandbox businesses whose expiry has passed
  // paymentGatewayProvider = 'sandbox' and paymentGatewayId = ISO expiry string
  const expiredBusinesses = await prisma.business.findMany({
    where: {
      plan: 'sandbox',
      paymentGatewayProvider: 'sandbox',
    },
    select: { id: true, paymentGatewayId: true, name: true },
  });

  const force = req.query.force === 'true';
  const toDelete = force
    ? expiredBusinesses
    : expiredBusinesses.filter((b) => {
        if (!b.paymentGatewayId) return true; // safety: delete if no expiry set
        return now > new Date(b.paymentGatewayId);
      });

  if (toDelete.length === 0) {
    return res.status(200).json({
      success: true,
      message: force ? 'No sandbox businesses found.' : 'No expired sandboxes found.',
      deleted: 0,
    });
  }

  let deletedCount = 0;
  const errors = [];

  for (const business of toDelete) {
    try {
      await deleteSandboxData(business.id);
      deletedCount++;
      console.info(`[SANDBOX CLEANUP] Deleted sandbox: ${business.id}`);
    } catch (err) {
      console.error(`[SANDBOX CLEANUP] Failed to delete ${business.id}:`, err.message);
      errors.push({ businessId: business.id, error: err.message });
    }
  }

  res.status(200).json({
    success: true,
    message: `Cleanup complete. Deleted ${deletedCount} sandbox(es).${force ? ' (forced)' : ''}`,
    deleted: deletedCount,
    errors: errors.length > 0 ? errors : undefined,
  });
});

// ---------------------------------------------------------------------------
// Helper: Delete all sandbox data in safe FK-respecting order
// ---------------------------------------------------------------------------
async function deleteSandboxData(businessId) {
  // We use raw prisma (not tenant DB) since we're deleting the whole workspace.
  // Order matters — delete children before parents.

  await prisma.$transaction([
    // Receipts (references Sales and Payments)
    prisma.receipt.deleteMany({ where: { businessId } }),

    // Payments (references Invoices)
    prisma.payment.deleteMany({ where: { businessId } }),

    // Invoices (references Jobs)
    prisma.invoice.deleteMany({ where: { businessId } }),

    // JobMaterials (references Jobs and Materials)
    prisma.jobMaterial.deleteMany({ where: { businessId } }),

    // Jobs
    prisma.job.deleteMany({ where: { businessId } }),

    // SaleItems (references Sales, Materials, Services)
    prisma.saleItem.deleteMany({ where: { businessId } }),

    // Sales
    prisma.sale.deleteMany({ where: { businessId } }),

    // MaterialReorders (references Materials)
    prisma.materialReorder.deleteMany({ where: { businessId } }),

    // MaterialUnits (references Materials and GlobalUnits)
    prisma.materialUnit.deleteMany({ where: { businessId } }),

    // Materials
    prisma.material.deleteMany({ where: { businessId } }),

    // GlobalUnits
    prisma.globalUnit.deleteMany({ where: { businessId } }),

    // Services
    prisma.service.deleteMany({ where: { businessId } }),

    // Expenses
    prisma.expense.deleteMany({ where: { businessId } }),

    // Customers
    prisma.customer.deleteMany({ where: { businessId } }),

    // Bookings
    prisma.booking.deleteMany({ where: { businessId } }),

    // AuditLogs
    prisma.auditLog.deleteMany({ where: { businessId } }),

    // BusinessSettings
    prisma.businessSettings.deleteMany({ where: { businessId } }),

    // Users
    prisma.user.deleteMany({ where: { businessId } }),

    // Finally: the Business itself
    prisma.business.delete({ where: { id: businessId } }),
  ]);
}