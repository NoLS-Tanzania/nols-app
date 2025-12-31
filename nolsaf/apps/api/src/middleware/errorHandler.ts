// Centralized error handler middleware
// Prevents stack trace leaks in production
import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
}

/**
 * Centralized error handler middleware
 * Should be used as the last middleware in the Express app
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error details
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  const isProduction = process.env.NODE_ENV === 'production';

  // Determine status code
  const statusCode = err.status || err.statusCode || 500;

  // Prepare error response
  const errorResponse: any = {
    error: err.message || 'Internal server error',
  };

  // Only include stack trace and detailed error in development
  if (!isProduction) {
    errorResponse.stack = err.stack;
    errorResponse.details = err;
  }

  // Add status code to response
  res.status(statusCode).json(errorResponse);
}

/**
 * Async error wrapper - wraps async route handlers to catch errors
 * Usage: router.get('/route', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

