import jwt from 'jsonwebtoken';
import basePrisma from '../config/database.js';
import { AppError, asyncHandler } from './errorHandler.js';

export const requireSuperAdmin = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('Super admin access required', 401, 'AUTH_REQUIRED');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.SUPER_ADMIN_JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Session expired. Please log in again.', 401, 'TOKEN_EXPIRED');
    }
    throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }

  if (decoded.type !== 'superadmin') {
    throw new AppError('Invalid token type', 401, 'INVALID_TOKEN');
  }

  const superAdmin = await basePrisma.superAdmin.findUnique({
    where: { id: decoded.id },
    select: { id: true, email: true, fullName: true, isActive: true },
  });

  if (!superAdmin) {
    throw new AppError('Super admin account not found', 401, 'USER_NOT_FOUND');
  }

  if (!superAdmin.isActive) {
    throw new AppError('Account deactivated', 401, 'ACCOUNT_DEACTIVATED');
  }

  req.superAdmin = superAdmin;
  next();
});

export const generateSuperAdminToken = (superAdmin) => {
  return jwt.sign(
    { id: superAdmin.id, email: superAdmin.email, type: 'superadmin' },
    process.env.SUPER_ADMIN_JWT_SECRET,
    { expiresIn: process.env.SUPER_ADMIN_JWT_EXPIRES_IN || '4h' }
  );
};
