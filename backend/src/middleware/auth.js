import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { AppError, asyncHandler } from './errorHandler.js';

// Protect routes - Verify JWT token
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('Not authorized to access this route', 401, 'AUTH_REQUIRED');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new AppError('User no longer exists', 401, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('User account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired. Please login again.', 401, 'TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
    }
    throw error;
  }
});

// Check if user has specific role
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'AUTH_REQUIRED');
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(
        `Role '${req.user.role}' is not authorized to access this route`,
        403,
        'PERMISSION_DENIED'
      );
    }

    next();
  };
};

// Check if user has specific permission
export const requirePermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'AUTH_REQUIRED');
    }

    // Admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    // Check permissions
    const userPermissions = req.user.permissions || {};
    const modulePermissions = userPermissions[module] || [];

    if (!modulePermissions.includes(action)) {
      throw new AppError(
        `You do not have permission to ${action} ${module}`,
        403,
        'PERMISSION_DENIED'
      );
    }

    next();
  };
};

// Check if user can access resource (ownership or full permission)
export const canAccessResource = (module, action) => {
  return async (req, res, next) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'AUTH_REQUIRED');
    }

    // Admin has all access
    if (req.user.role === 'admin') {
      return next();
    }

    const userPermissions = req.user.permissions || {};
    const modulePermissions = userPermissions[module] || [];

    // Check full permission
    if (modulePermissions.includes(action)) {
      return next();
    }

    // Check "own" permission
    const ownAction = `${action}Own`;
    if (modulePermissions.includes(ownAction)) {
      req.isOwnResource = true; // Flag to filter by user in controller
      return next();
    }

    throw new AppError(
      `You do not have permission to ${action} ${module}`,
      403,
      'PERMISSION_DENIED'
    );
  };
};

// Check job type access (for mechanic, sprayer, bodyworks)
export const requireJobTypeAccess = (req, res, next) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401, 'AUTH_REQUIRED');
  }

  // Admin can access all job types
  if (req.user.role === 'admin') {
    return next();
  }

  // Map role to job type
  const roleToJobType = {
    mechanic: 'mechanic',
    sprayer: 'sprayer',
    bodyworks: 'bodyworks',
  };

  const allowedJobType = roleToJobType[req.user.role];
  
  if (!allowedJobType) {
    throw new AppError(
      'Your role does not have access to jobs',
      403,
      'PERMISSION_DENIED'
    );
  }

  // Attach allowed job type to request
  req.allowedJobType = allowedJobType;
  next();
};

// Generate JWT token
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    }
  );
};

// Verify permission helper (for use in controllers)
export const hasPermission = (user, module, action) => {
  if (user.role === 'admin') return true;
  
  const userPermissions = user.permissions || {};
  const modulePermissions = userPermissions[module] || [];
  
  return modulePermissions.includes(action);
};