import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api/ApiError';

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check if it's our custom ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Handle other types of errors (unexpected errors)
  console.error('Unexpected Error:', err);

  return res.status(500).json({
    success: false,
    statusCode: 500,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      originalError: err.message,
    }),
  });
};
