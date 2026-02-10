import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { AppError, asyncHandler } from './errorHandler.js';

// ==========================================================================
// 1. CORE PROTECTION (Verifies Token & Fetches User)
// ==========================================================================
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('Not authorized to access this route', 401, 'AUTH_REQUIRED');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        permissions: true, // Crucial: Fetch permissions JSON
        isActive: true,
      },
    });

    if (!user) {
      throw new AppError('User no longer exists', 401, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('User account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
    }

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

// ==========================================================================
// 2. ROLE AUTHORIZATION (Strict Role Check)
// Use this ONLY when a route is strictly for a specific role (e.g. Mechanic)
// ==========================================================================
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'AUTH_REQUIRED');
    }

    // Admin always has access? 
    // Uncomment next line if Admin should pass ANY 'authorize' check:
    if (req.user.role === 'admin') return next();

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

// ==========================================================================
// 3. GRANULAR PERMISSIONS (The one you need)
// Checks if user has specific permission OR is Admin
// ==========================================================================
export const requirePermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'AUTH_REQUIRED');
    }

    // 1. SUPER USER OVERRIDE
    // If user is Admin, they pass automatically.
    if (req.user.role === 'admin') {
      return next();
    }

    // 2. GRANULAR CHECK
    // Expected structure: { "products": ["create", "edit"], "sales": ["view"] }
    const userPermissions = req.user.permissions || {};
    const resourcePermissions = userPermissions[resource] || [];

    // We check if the array includes the action OR if they have a wildcard '*'
    if (resourcePermissions.includes(action) || resourcePermissions.includes('*')) {
      return next();
    }

    // 3. DENY ACCESS
    throw new AppError(
      `Access Denied: You do not have permission to ${action} ${resource}`,
      403,
      'PERMISSION_DENIED'
    );
  };
};

// ==========================================================================
// 4. RESOURCE OWNERSHIP (Own vs Any)
// Checks "view" (all) vs "viewOwn" (only their own records)
// ==========================================================================
export const canAccessResource = (resource, action) => {
  return async (req, res, next) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'AUTH_REQUIRED');
    }

    // Admin passes
    if (req.user.role === 'admin') {
      return next();
    }

    const userPermissions = req.user.permissions || {};
    const resourcePermissions = userPermissions[resource] || [];

    // 1. Check for Full Permission (e.g. "view")
    if (resourcePermissions.includes(action) || resourcePermissions.includes('*')) {
      return next();
    }

    // 2. Check for "Own" Permission (e.g. "viewOwn")
    const ownAction = `${action}Own`;
    if (resourcePermissions.includes(ownAction)) {
      req.isOwnResource = true; // Controller must use this flag to filter DB query
      return next();
    }

    throw new AppError(
      `You do not have permission to ${action} ${resource}`,
      403,
      'PERMISSION_DENIED'
    );
  };
};

// ==========================================================================
// 5. JOB TYPE ACCESS (Specific to your workshop logic)
// ==========================================================================
export const requireJobTypeAccess = (req, res, next) => {
  if (!req.user) return next(new AppError('Not authenticated', 401));

  if (req.user.role === 'admin') return next();

  const roleToJobType = {
    mechanic: 'mechanic',
    sprayer: 'sprayer',
    bodyworks: 'bodyworks',
  };

  const allowedJobType = roleToJobType[req.user.role];
  
  if (!allowedJobType) {
    throw new AppError('Role not authorized for jobs', 403, 'PERMISSION_DENIED');
  }

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