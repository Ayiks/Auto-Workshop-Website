import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private (requires 'users:view' permission)
export const getUsers = asyncHandler(async (req, res) => {
  const { role, isActive, search } = req.query;

  const where = {};

  // Filter by role
  if (role) {
    where.role = role;
  }

  // Filter by active status
  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  // Search by username, fullName, or email
  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      permissions: true,
      isActive: true,
      createdAt: true,
      lastLogin: true,
      _count: {
        select: {
          salesMade: true,
          jobsAssigned: true,
          expensesRecorded: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (requires 'users:view' permission)
export const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      permissions: true,
      isActive: true,
      createdAt: true,
      lastLogin: true,
      _count: {
        select: {
          salesMade: true,
          jobsAssigned: true,
          expensesRecorded: true,
          reordersCreated: true,
          paymentsReceived: true,
          receiptsIssued: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Create new user
// @route   POST /api/users
// @access  Private (requires 'users:create' permission)
export const createUser = asyncHandler(async (req, res) => {
  const {
    username,
    password,
    fullName,
    email,
    phone,
    role,
    permissions = {},
  } = req.body;

  // Validation
  if (!username || !password || !role) {
    throw new AppError(
      'Please provide username, password, and role',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (password.length < 6) {
    throw new AppError(
      'Password must be at least 6 characters',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Validate role
  const validRoles = ['admin', 'sales', 'mechanic', 'sprayer', 'bodyworks'];
  if (!validRoles.includes(role)) {
    throw new AppError(
      `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      400,
      'VALIDATION_ERROR'
    );
  }

  // Check if username already exists
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    throw new AppError(
      'Username already exists',
      400,
      'DUPLICATE_ENTRY'
    );
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      username: username.trim().toLowerCase(),
      passwordHash,
      fullName: fullName?.trim(),
      email: email?.trim(),
      phone: phone?.trim(),
      role,
      permissions,
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      permissions: true,
      isActive: true,
      createdAt: true,
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      description: `Created user: ${user.username} (${user.role})`,
    },
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user,
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (requires 'users:edit' permission)
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullName, email, phone, role, isActive } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  // Cannot deactivate yourself
  if (parseInt(id) === req.user.id && isActive === false) {
    throw new AppError(
      'You cannot deactivate your own account',
      400,
      'INVALID_OPERATION'
    );
  }

  // Validate role if provided
  if (role) {
    const validRoles = ['admin', 'sales', 'mechanic', 'sprayer', 'bodyworks'];
    if (!validRoles.includes(role)) {
      throw new AppError(
        `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  const updateData = {};
  if (fullName !== undefined) updateData.fullName = fullName?.trim();
  if (email !== undefined) updateData.email = email?.trim();
  if (phone !== undefined) updateData.phone = phone?.trim();
  if (role) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);

  const updatedUser = await prisma.user.update({
    where: { id: parseInt(id) },
    data: updateData,
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      permissions: true,
      isActive: true,
      createdAt: true,
      lastLogin: true,
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: updatedUser.id,
      description: `Updated user: ${updatedUser.username}`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: updatedUser,
  });
});

// @desc    Update user permissions
// @route   PUT /api/users/:id/permissions
// @access  Private (requires 'users:managePermissions' permission)
export const updateUserPermissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;

  if (!permissions || typeof permissions !== 'object') {
    throw new AppError(
      'Please provide valid permissions object',
      400,
      'VALIDATION_ERROR'
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  // Admin users automatically have all permissions
  if (user.role === 'admin') {
    throw new AppError(
      'Cannot modify admin permissions. Admins have all permissions by default.',
      400,
      'INVALID_OPERATION'
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: parseInt(id) },
    data: { permissions },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      permissions: true,
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: updatedUser.id,
      description: `Updated permissions for user: ${updatedUser.username}`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'User permissions updated successfully',
    data: updatedUser,
  });
});

// @desc    Change user password (admin only)
// @route   PUT /api/users/:id/password
// @access  Private (requires 'users:edit' permission)
export const changeUserPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    throw new AppError(
      'Password must be at least 6 characters',
      400,
      'VALIDATION_ERROR'
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: parseInt(id) },
    data: { passwordHash },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: parseInt(id),
      description: `Changed password for user: ${user.username}`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});

// @desc    Deactivate user
// @route   PUT /api/users/:id/deactivate
// @access  Private (requires 'users:edit' permission)
export const deactivateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  // Cannot deactivate yourself
  if (parseInt(id) === req.user.id) {
    throw new AppError(
      'You cannot deactivate your own account',
      400,
      'INVALID_OPERATION'
    );
  }

  if (!user.isActive) {
    throw new AppError('User is already deactivated', 400, 'INVALID_OPERATION');
  }

  const updatedUser = await prisma.user.update({
    where: { id: parseInt(id) },
    data: { isActive: false },
    select: {
      id: true,
      username: true,
      fullName: true,
      isActive: true,
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'DEACTIVATE',
      entity: 'User',
      entityId: updatedUser.id,
      description: `Deactivated user: ${updatedUser.username}`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'User deactivated successfully',
    data: updatedUser,
  });
});

// @desc    Activate user
// @route   PUT /api/users/:id/activate
// @access  Private (requires 'users:edit' permission)
export const activateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  if (user.isActive) {
    throw new AppError('User is already active', 400, 'INVALID_OPERATION');
  }

  const updatedUser = await prisma.user.update({
    where: { id: parseInt(id) },
    data: { isActive: true },
    select: {
      id: true,
      username: true,
      fullName: true,
      isActive: true,
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'ACTIVATE',
      entity: 'User',
      entityId: updatedUser.id,
      description: `Activated user: ${updatedUser.username}`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'User activated successfully',
    data: updatedUser,
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (requires 'users:delete' permission)
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
    include: {
      _count: {
        select: {
          salesMade: true,
          jobsAssigned: true,
          expensesRecorded: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  // Cannot delete yourself
  if (parseInt(id) === req.user.id) {
    throw new AppError(
      'You cannot delete your own account',
      400,
      'INVALID_OPERATION'
    );
  }

  // Check if user has transaction history
  const hasTransactions = 
    user._count.salesMade > 0 ||
    user._count.jobsAssigned > 0 ||
    user._count.expensesRecorded > 0;

  if (hasTransactions) {
    // Soft delete - deactivate instead
    const deactivatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DEACTIVATE',
        entity: 'User',
        entityId: deactivatedUser.id,
        description: `Deactivated user with transaction history: ${deactivatedUser.username}`,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'User deactivated (has transaction history)',
      data: deactivatedUser,
    });
  }

  // Hard delete if no transaction history
  await prisma.user.delete({
    where: { id: parseInt(id) },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'DELETE',
      entity: 'User',
      entityId: parseInt(id),
      description: `Deleted user: ${user.username}`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private (requires 'users:view' permission)
export const getUserStats = asyncHandler(async (req, res) => {
  const [totalUsers, usersByRole, activeUsers, recentUsers] = await Promise.all([
    // Total users
    prisma.user.count(),

    // Users by role
    prisma.user.groupBy({
      by: ['role'],
      _count: true,
    }),

    // Active users
    prisma.user.count({
      where: { isActive: true },
    }),

    // Recent users
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersByRole,
      recentUsers,
    },
  });
});