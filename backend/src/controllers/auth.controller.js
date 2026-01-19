import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { generateToken } from '../middleware/auth.js';

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Validation
  if (!username || !password) {
    throw new AppError('Please provide username and password', 400, 'VALIDATION_ERROR');
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Check if account is active
  if (!user.isActive) {
    throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  // Generate token
  const token = generateToken(user);

  // Remove sensitive data
  const { passwordHash, ...userWithoutPassword } = user;

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: userWithoutPassword,
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
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

  res.json({
    success: true,
    user,
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  // In a JWT system, logout is typically handled client-side
  // by removing the token from storage
  
  // Optionally, you can blacklist the token here
  // For now, we'll just return success
  
  res.json({
    success: true,
    message: 'Logout successful',
  });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Validation
  if (!currentPassword || !newPassword) {
    throw new AppError('Please provide current and new password', 400, 'VALIDATION_ERROR');
  }

  if (newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters', 400, 'VALIDATION_ERROR');
  }

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

  // Update password
  await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash: hashedPassword },
  });

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});