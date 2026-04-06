/**
 * Global error handler middleware.
 * Catches all errors and returns a standardized JSON response.
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/environment';

/**
 * Custom error class with HTTP status code
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Global error handler middleware.
 * Must be the last middleware in the chain.
 */
export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Log the error
  if (err instanceof AppError) {
    console.error(`[Error] ${err.message} (status: ${err.statusCode})`);
  } else {
    console.error(`[Error] Unhandled error: ${err.message}`);
    console.error(err.stack);
  }

  // Build response
  const response: {
    success: boolean;
    error: string;
    details?: Record<string, unknown>;
    stack?: string;
  } = {
    success: false,
    error: err.message || 'Internal Server Error',
  };

  // Include details if present
  if (err instanceof AppError && err.details) {
    response.details = err.details;
  }

  // Include stack trace in development
  if (env.isDev && err.stack) {
    response.stack = err.stack;
  }

  // Set status code
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  res.status(statusCode).json(response);
}
