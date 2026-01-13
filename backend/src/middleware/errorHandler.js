// Custom Error Class
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error Handler Middleware
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error
  console.error('Error:', {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Prisma Errors
  if (err.code === 'P2002') {
    error = new AppError(
      'Duplicate entry. This record already exists.',
      400,
      'DUPLICATE_ENTRY',
      { field: err.meta?.target }
    );
  }

  if (err.code === 'P2025') {
    error = new AppError(
      'Record not found',
      404,
      'NOT_FOUND'
    );
  }

  if (err.code === 'P2003') {
    error = new AppError(
      'Invalid reference. Related record not found.',
      400,
      'INVALID_REFERENCE'
    );
  }

  // Validation Errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401, 'TOKEN_EXPIRED');
  }

  // Send response
  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Something went wrong',
      ...(error.details && { details: error.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  });
};

// Not Found Handler
export const notFound = (req, res, next) => {
  const error = new AppError(
    `Route not found: ${req.originalUrl}`,
    404,
    'NOT_FOUND'
  );
  next(error);
};

// Async Handler Wrapper
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};