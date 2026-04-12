import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import basePrisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { generateSuperAdminToken } from '../middleware/superadminAuth.js';

// Helper: write admin audit log (fire-and-forget)
const logAdminAction = (superAdminId, action, description, extras = {}) => {
  basePrisma.adminAuditLog.create({
    data: {
      superAdminId,
      action,
      description,
      targetType: extras.targetType || null,
      targetId: extras.targetId ? String(extras.targetId) : null,
      rawSql: extras.rawSql || null,
      ipAddress: extras.ipAddress || null,
    },
  }).catch((e) => console.error('[AdminAuditLog] Failed to write:', e.message));
};

// ==========================================================================
// AUTH
// ==========================================================================

export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
  }

  const superAdmin = await basePrisma.superAdmin.findUnique({ where: { email } });

  if (!superAdmin || !superAdmin.isActive) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const isMatch = await bcrypt.compare(password, superAdmin.passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  await basePrisma.superAdmin.update({
    where: { id: superAdmin.id },
    data: { lastLogin: new Date() },
  });

  const token = generateSuperAdminToken(superAdmin);

  res.json({
    success: true,
    token,
    superAdmin: { id: superAdmin.id, email: superAdmin.email, fullName: superAdmin.fullName },
  });
});

export const adminGetMe = asyncHandler(async (req, res) => {
  res.json({ success: true, superAdmin: req.superAdmin });
});

// ==========================================================================
// SYSTEM STATS
// ==========================================================================

export const getSystemStats = asyncHandler(async (req, res) => {
  const [
    totalBusinesses,
    activeBusinesses,
    activeSubscriptions,
    proPlanCount,
    totalUsers,
    activeUsers,
    recentBusinesses,
    unresolvedErrors,
  ] = await Promise.all([
    basePrisma.business.count(),
    basePrisma.business.count({ where: { isActive: true } }),
    basePrisma.business.count({ where: { subscriptionStatus: 'active' } }),
    basePrisma.business.count({ where: { plan: 'pro' } }),
    basePrisma.user.count(),
    basePrisma.user.count({ where: { isActive: true } }),
    basePrisma.business.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, name: true, plan: true, subscriptionStatus: true, isActive: true, createdAt: true, _count: { select: { users: true } } },
    }),
    basePrisma.systemErrorLog.count({ where: { resolved: false } }),
  ]);

  res.json({
    success: true,
    data: {
      totalBusinesses,
      activeBusinesses,
      inactiveBusinesses: totalBusinesses - activeBusinesses,
      activeSubscriptions,
      proPlanCount,
      freePlanCount: totalBusinesses - proPlanCount,
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      unresolvedErrors,
      recentBusinesses,
    },
  });
});

// ==========================================================================
// BUSINESSES
// ==========================================================================

export const listBusinesses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, plan, subscriptionStatus, isActive } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {};
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (plan) where.plan = plan;
  if (subscriptionStatus) where.subscriptionStatus = subscriptionStatus;
  if (isActive !== undefined && isActive !== '') where.isActive = isActive === 'true';

  const [businesses, total] = await Promise.all([
    basePrisma.business.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, jobs: true, sales: true } },
        settings: { select: { name: true, phone: true, email: true }, take: 1 },
      },
    }),
    basePrisma.business.count({ where }),
  ]);

  res.json({
    success: true,
    data: businesses,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

export const getBusinessDetail = asyncHandler(async (req, res) => {
  const { businessId } = req.params;

  const business = await basePrisma.business.findUnique({
    where: { id: businessId },
    include: {
      settings: true,
      users: {
        select: { id: true, username: true, fullName: true, role: true, isActive: true, lastLogin: true, email: true, phone: true },
        orderBy: { role: 'asc' },
      },
      _count: { select: { users: true, jobs: true, sales: true, invoices: true, customers: true } },
    },
  });

  if (!business) throw new AppError('Business not found', 404, 'NOT_FOUND');

  const recentAuditLogs = await basePrisma.auditLog.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  res.json({ success: true, data: { ...business, recentAuditLogs } });
});

export const updateBusiness = asyncHandler(async (req, res) => {
  const { businessId } = req.params;
  const { isActive, plan, subscriptionStatus, paymentGatewayProvider, paymentGatewayId } = req.body;

  const existing = await basePrisma.business.findUnique({ where: { id: businessId } });
  if (!existing) throw new AppError('Business not found', 404, 'NOT_FOUND');

  const data = {};
  if (isActive !== undefined) data.isActive = isActive;
  if (plan) data.plan = plan;
  if (subscriptionStatus) data.subscriptionStatus = subscriptionStatus;
  if (paymentGatewayProvider !== undefined) data.paymentGatewayProvider = paymentGatewayProvider;
  if (paymentGatewayId !== undefined) data.paymentGatewayId = paymentGatewayId;

  const updated = await basePrisma.business.update({ where: { id: businessId }, data });

  logAdminAction(req.superAdmin.id, 'UPDATE_BUSINESS', `Updated business ${existing.name}`, {
    targetType: 'Business', targetId: businessId, ipAddress: req.ip,
  });

  res.json({ success: true, data: updated });
});

export const toggleBusinessStatus = asyncHandler(async (req, res) => {
  const { businessId } = req.params;

  const business = await basePrisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw new AppError('Business not found', 404, 'NOT_FOUND');

  const updated = await basePrisma.business.update({
    where: { id: businessId },
    data: { isActive: !business.isActive },
  });

  logAdminAction(req.superAdmin.id, 'TOGGLE_BUSINESS_STATUS',
    `${updated.isActive ? 'Activated' : 'Deactivated'} business ${business.name}`,
    { targetType: 'Business', targetId: businessId, ipAddress: req.ip }
  );

  res.json({ success: true, data: { id: updated.id, isActive: updated.isActive } });
});

export const updateSubscription = asyncHandler(async (req, res) => {
  const { businessId } = req.params;
  const { plan, subscriptionStatus, paymentGatewayProvider, paymentGatewayId } = req.body;

  const business = await basePrisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw new AppError('Business not found', 404, 'NOT_FOUND');

  const data = {};
  if (plan) data.plan = plan;
  if (subscriptionStatus) data.subscriptionStatus = subscriptionStatus;
  if (paymentGatewayProvider !== undefined) data.paymentGatewayProvider = paymentGatewayProvider;
  if (paymentGatewayId !== undefined) data.paymentGatewayId = paymentGatewayId;

  const updated = await basePrisma.business.update({ where: { id: businessId }, data });

  logAdminAction(req.superAdmin.id, 'UPDATE_SUBSCRIPTION',
    `Updated subscription for ${business.name}: plan=${updated.plan}, status=${updated.subscriptionStatus}`,
    { targetType: 'Business', targetId: businessId, ipAddress: req.ip }
  );

  res.json({ success: true, data: updated });
});

// ==========================================================================
// USERS (cross-tenant)
// ==========================================================================

export const listAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, businessId, role, isActive } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {};
  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (businessId) where.businessId = businessId;
  if (role) where.role = role;
  if (isActive !== undefined && isActive !== '') where.isActive = isActive === 'true';

  const [users, total] = await Promise.all([
    basePrisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, username: true, fullName: true, email: true, phone: true,
        role: true, isActive: true, createdAt: true, lastLogin: true, businessId: true,
        business: { select: { id: true, name: true } },
      },
    }),
    basePrisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: users,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  const { fullName, email, phone, role } = req.body;

  const user = await basePrisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  const data = {};
  if (fullName !== undefined) data.fullName = fullName;
  if (email !== undefined) data.email = email;
  if (phone !== undefined) data.phone = phone;
  if (role !== undefined) data.role = role;

  const updated = await basePrisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true, username: true, fullName: true, email: true, phone: true,
      role: true, isActive: true, isEmailVerified: true, lastLogin: true, businessId: true,
    },
  });

  logAdminAction(req.superAdmin.id, 'UPDATE_USER', `Updated user ${user.username}`,
    { targetType: 'User', targetId: userId, ipAddress: req.ip }
  );

  res.json({ success: true, data: updated });
});

export const verifyUserEmail = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);

  const user = await basePrisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  const updated = await basePrisma.user.update({
    where: { id: userId },
    data: {
      isEmailVerified: true,
      emailVerificationToken: null,
      verificationTokenExpiry: null,
    },
    select: { id: true, username: true, email: true, isEmailVerified: true },
  });

  logAdminAction(req.superAdmin.id, 'VERIFY_USER_EMAIL', `Force-verified email for user ${user.username}`,
    { targetType: 'User', targetId: userId, ipAddress: req.ip }
  );

  res.json({ success: true, data: updated });
});

export const resetUserPassword = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400, 'VALIDATION_ERROR');
  }

  const user = await basePrisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await basePrisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  logAdminAction(req.superAdmin.id, 'RESET_USER_PASSWORD', `Reset password for user ${user.username}`,
    { targetType: 'User', targetId: userId, ipAddress: req.ip }
  );

  res.json({ success: true, message: 'Password reset successfully' });
});

export const toggleUserStatus = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);

  const user = await basePrisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  const updated = await basePrisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  });

  logAdminAction(req.superAdmin.id, 'TOGGLE_USER_STATUS',
    `${updated.isActive ? 'Activated' : 'Deactivated'} user ${user.username} (businessId: ${user.businessId})`,
    { targetType: 'User', targetId: userId, ipAddress: req.ip }
  );

  res.json({ success: true, data: { id: updated.id, isActive: updated.isActive } });
});

// ==========================================================================
// AUDIT LOGS (cross-tenant)
// ==========================================================================

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, businessId, userId, action, entity, startDate, endDate } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {};
  if (businessId) where.businessId = businessId;
  if (userId) where.userId = Number(userId);
  if (action) where.action = { contains: action, mode: 'insensitive' };
  if (entity) where.entity = { contains: entity, mode: 'insensitive' };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    basePrisma.auditLog.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        business: { select: { id: true, name: true } },
      },
    }),
    basePrisma.auditLog.count({ where }),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

// ==========================================================================
// FEATURE FLAGS
// ==========================================================================

export const listFeatureFlags = asyncHandler(async (req, res) => {
  const flags = await basePrisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  res.json({ success: true, data: flags });
});

export const createFeatureFlag = asyncHandler(async (req, res) => {
  const { key, name, description, isGloballyEnabled = false, enabledBusinessIds = [] } = req.body;

  if (!key || !name) throw new AppError('key and name are required', 400, 'VALIDATION_ERROR');

  const snakeCasePattern = /^[a-z][a-z0-9_]*$/;
  if (!snakeCasePattern.test(key)) {
    throw new AppError('key must be snake_case (lowercase letters, digits, underscores)', 400, 'VALIDATION_ERROR');
  }

  const flag = await basePrisma.featureFlag.create({
    data: { key, name, description, isGloballyEnabled, enabledBusinessIds },
  });

  logAdminAction(req.superAdmin.id, 'CREATE_FEATURE_FLAG', `Created feature flag: ${key}`,
    { targetType: 'FeatureFlag', targetId: flag.id, ipAddress: req.ip }
  );

  res.status(201).json({ success: true, data: flag });
});

export const updateFeatureFlag = asyncHandler(async (req, res) => {
  const flagId = Number(req.params.flagId);
  const { name, description, isGloballyEnabled, enabledBusinessIds } = req.body;

  const existing = await basePrisma.featureFlag.findUnique({ where: { id: flagId } });
  if (!existing) throw new AppError('Feature flag not found', 404, 'NOT_FOUND');

  const data = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (isGloballyEnabled !== undefined) data.isGloballyEnabled = isGloballyEnabled;
  if (enabledBusinessIds !== undefined) data.enabledBusinessIds = enabledBusinessIds;

  const updated = await basePrisma.featureFlag.update({ where: { id: flagId }, data });

  logAdminAction(req.superAdmin.id, 'UPDATE_FEATURE_FLAG', `Updated feature flag: ${existing.key}`,
    { targetType: 'FeatureFlag', targetId: flagId, ipAddress: req.ip }
  );

  res.json({ success: true, data: updated });
});

export const deleteFeatureFlag = asyncHandler(async (req, res) => {
  const flagId = Number(req.params.flagId);

  const existing = await basePrisma.featureFlag.findUnique({ where: { id: flagId } });
  if (!existing) throw new AppError('Feature flag not found', 404, 'NOT_FOUND');

  await basePrisma.featureFlag.delete({ where: { id: flagId } });

  logAdminAction(req.superAdmin.id, 'DELETE_FEATURE_FLAG', `Deleted feature flag: ${existing.key}`,
    { targetType: 'FeatureFlag', targetId: flagId, ipAddress: req.ip }
  );

  res.json({ success: true });
});

export const toggleFlagForBusiness = asyncHandler(async (req, res) => {
  const flagId = Number(req.params.flagId);
  const { businessId } = req.params;

  const flag = await basePrisma.featureFlag.findUnique({ where: { id: flagId } });
  if (!flag) throw new AppError('Feature flag not found', 404, 'NOT_FOUND');

  const business = await basePrisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw new AppError('Business not found', 404, 'NOT_FOUND');

  const alreadyEnabled = flag.enabledBusinessIds.includes(businessId);
  const enabledBusinessIds = alreadyEnabled
    ? flag.enabledBusinessIds.filter((id) => id !== businessId)
    : [...flag.enabledBusinessIds, businessId];

  const updated = await basePrisma.featureFlag.update({
    where: { id: flagId },
    data: { enabledBusinessIds },
  });

  logAdminAction(req.superAdmin.id, 'TOGGLE_FLAG_FOR_BUSINESS',
    `${alreadyEnabled ? 'Removed' : 'Added'} flag ${flag.key} for business ${business.name}`,
    { targetType: 'FeatureFlag', targetId: flagId, ipAddress: req.ip }
  );

  res.json({ success: true, data: updated });
});

export const checkFeatureFlag = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { businessId } = req.query;

  const flag = await basePrisma.featureFlag.findUnique({ where: { key } });

  if (!flag) {
    return res.json({ success: true, isEnabled: false });
  }

  const isEnabled = flag.isGloballyEnabled ||
    (businessId ? flag.enabledBusinessIds.includes(businessId) : false);

  res.json({ success: true, isEnabled });
});

// ==========================================================================
// RAW QUERY RUNNER
// ==========================================================================

export const runQuery = asyncHandler(async (req, res) => {
  const { sql, confirmed } = req.body;

  if (!sql || typeof sql !== 'string') {
    throw new AppError('sql is required', 400, 'VALIDATION_ERROR');
  }
  if (!confirmed) {
    throw new AppError('confirmed must be true', 400, 'VALIDATION_ERROR');
  }
  if (sql.length > 5000) {
    throw new AppError('Query too long (max 5000 characters)', 400, 'VALIDATION_ERROR');
  }

  const trimmed = sql.trim();

  // Block non-SELECT statements
  const forbidden = /^\s*(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXEC|EXECUTE)\b/i;
  if (forbidden.test(trimmed)) {
    throw new AppError('Only SELECT statements are permitted', 403, 'QUERY_BLOCKED');
  }

  // Block multi-statement queries
  const statements = trimmed.split(';').filter((s) => s.trim().length > 0);
  if (statements.length > 1) {
    throw new AppError('Multi-statement queries are not allowed', 403, 'QUERY_BLOCKED');
  }

  // Always log before execution
  logAdminAction(req.superAdmin.id, 'RAW_QUERY', `Executed SQL query`,
    { targetType: 'Database', rawSql: trimmed, ipAddress: req.ip }
  );

  const rows = await basePrisma.$queryRawUnsafe(trimmed);

  // Convert BigInt values to strings for JSON serialization
  const serialized = JSON.parse(JSON.stringify(rows, (_, v) =>
    typeof v === 'bigint' ? v.toString() : v
  ));

  res.json({ success: true, rowCount: serialized.length, data: serialized });
});

// ==========================================================================
// SYSTEM ERROR LOGS
// ==========================================================================

export const getSystemErrorLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, resolved, statusCode, startDate, endDate, businessId } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {};
  if (resolved !== undefined) where.resolved = resolved === 'true';
  if (statusCode) where.statusCode = Number(statusCode);
  if (businessId) where.businessId = businessId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    basePrisma.systemErrorLog.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    basePrisma.systemErrorLog.count({ where }),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

export const resolveSystemError = asyncHandler(async (req, res) => {
  const errorId = Number(req.params.errorId);

  const log = await basePrisma.systemErrorLog.findUnique({ where: { id: errorId } });
  if (!log) throw new AppError('Error log not found', 404, 'NOT_FOUND');

  const updated = await basePrisma.systemErrorLog.update({
    where: { id: errorId },
    data: { resolved: true, resolvedAt: new Date(), resolvedBy: req.superAdmin.id },
  });

  res.json({ success: true, data: { id: updated.id, resolved: updated.resolved, resolvedAt: updated.resolvedAt } });
});

// ==========================================================================
// IMPERSONATION
// ==========================================================================

export const impersonateUser = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);

  const user = await basePrisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, fullName: true, role: true, businessId: true, isActive: true, permissions: true, email: true },
  });

  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  if (!user.isActive) throw new AppError('Cannot impersonate an inactive user', 400, 'USER_INACTIVE');

  const impersonationToken = jwt.sign(
    { id: user.id, username: user.username, role: user.role, businessId: user.businessId, isImpersonation: true },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  logAdminAction(req.superAdmin.id, 'IMPERSONATE_USER',
    `Impersonated user ${user.username} (id: ${user.id}) in business ${user.businessId}`,
    { targetType: 'User', targetId: userId, ipAddress: req.ip }
  );

  res.json({ success: true, impersonationToken, user });
});
