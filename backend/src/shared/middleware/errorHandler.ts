import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      statusCode: err.statusCode,
    });
    return;
  }

  console.error('💥 Unhandled Exception:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    statusCode: 500,
  });
};
