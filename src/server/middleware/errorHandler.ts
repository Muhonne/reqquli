import { Request, Response, NextFunction } from 'express';
import logger, { logError } from '../config/logger';

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error types for common application scenarios
 */
export const ErrorTypes = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
} as const;

/**
 * Factory functions for common errors
 */
export const createError = {
  validation: (message: string) => new AppError(message, ErrorTypes.VALIDATION_ERROR),
  unauthorized: (message = 'Unauthorized access') => new AppError(message, ErrorTypes.UNAUTHORIZED),
  forbidden: (message = 'Access denied') => new AppError(message, ErrorTypes.FORBIDDEN),
  notFound: (message: string) => new AppError(message, ErrorTypes.NOT_FOUND),
  conflict: (message: string) => new AppError(message, ErrorTypes.CONFLICT),
  internal: (message = 'Internal server error') => new AppError(message, ErrorTypes.INTERNAL_SERVER_ERROR)
};

/**
 * Handle database errors and convert them to AppError instances
 */
const handleDatabaseError = (error: any): AppError => {
  // PostgreSQL error codes
  switch (error.code) {
    case '23505': // unique_violation
      return createError.conflict('Duplicate entry - this record already exists');
    case '23503': // foreign_key_violation  
      return createError.validation('Referenced record does not exist');
    case '23502': // not_null_violation
      return createError.validation('Required field is missing');
    case '22001': // string_data_right_truncation
      return createError.validation('Input data exceeds maximum length');
    case '08000': // connection_exception
    case '08003': // connection_does_not_exist
    case '08006': // connection_failure
      return createError.internal('Database connection error');
    case '42P01': // undefined_table
      return createError.internal('Database configuration error');
    default:
      if (error.message && error.message.includes('duplicate key')) {
        return createError.conflict('Duplicate entry - this record already exists');
      }
      return createError.internal('Database operation failed');
  }
};

/**
 * Handle JWT errors
 */
const handleJWTError = (error: any): AppError => {
  if (error.name === 'JsonWebTokenError') {
    return createError.unauthorized('Invalid authentication token');
  }
  if (error.name === 'TokenExpiredError') {
    return createError.unauthorized('Authentication token has expired');
  }
  if (error.name === 'NotBeforeError') {
    return createError.unauthorized('Authentication token not yet valid');
  }
  return createError.unauthorized('Authentication failed');
};

/**
 * Handle validation errors from express-validator or similar libraries
 */
const handleValidationError = (error: any): AppError => {
  if (error.array && typeof error.array === 'function') {
    // express-validator errors
    const errors = error.array();
    const message = errors.map((err: any) => `${err.path}: ${err.msg}`).join(', ');
    return createError.validation(`Validation failed: ${message}`);
  }
  
  if (error.details && Array.isArray(error.details)) {
    // Joi validation errors
    const message = error.details.map((detail: any) => detail.message).join(', ');
    return createError.validation(`Validation failed: ${message}`);
  }
  
  return createError.validation('Validation failed');
};

/**
 * Development error response - includes stack trace
 */
const sendDevError = (err: AppError, res: Response) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      originalError: err.name 
    })
  });
};

/**
 * Production error response - no sensitive info
 */
const sendProdError = (err: AppError, res: Response) => {
  // Only send error details for operational errors
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  } else {
    // Don't leak error details for programming errors
    logger.error('Non-operational error detected', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      isOperational: err.isOperational || false
    });
    res.status(500).json({
      status: 'error',
      error: 'Something went wrong',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Global error handling middleware
 * Must be placed at the end of the middleware stack
 */
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Don't handle if headers already sent
  if (res.headersSent) {
    return next(err);
  }

  let error = { ...err };
  error.message = err.message;

  // Log the error using structured logging
  logError(err, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent') || 'Unknown',
    statusCode: error.statusCode,
    isOperational: error.isOperational
  });

  // Convert known errors to AppError instances
  if (err.code && (err.code.startsWith('23') || err.code.startsWith('08') || err.code.startsWith('42'))) {
    error = handleDatabaseError(err);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError') {
    error = handleJWTError(err);
  } else if (err.name === 'ValidationError' || (err.array && typeof err.array === 'function')) {
    error = handleValidationError(err);
  } else if (err.name === 'CastError') {
    error = createError.validation('Invalid data format');
  } else if (err.code === 11000) {
    error = createError.conflict('Duplicate field value');
  } else if (!err.statusCode) {
    // Unknown error - convert to AppError
    error = createError.internal(err.message || 'Something went wrong');
  }

  // Ensure error is an AppError instance
  if (!(error instanceof AppError)) {
    const appError = new AppError(error.message || 'Internal server error', error.statusCode || 500);
    error = appError;
  }

  // Send appropriate response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendDevError(error, res);
  } else {
    sendProdError(error, res);
  }
};

/**
 * 404 handler for unmatched routes
 * Should be placed after all route definitions
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error = createError.notFound(`Route ${req.method} ${req.originalUrl} not found`);
  next(error);
};

/**
 * Async wrapper to catch errors in async route handlers
 * Usage: app.get('/route', catchAsync(async (req, res) => { ... }))
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, _res, next)).catch(next);
  };
};