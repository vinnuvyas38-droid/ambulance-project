import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn(
      {
        code: err.code,
        message: err.message,
        path: req.path,
        method: req.method,
        details: err.details,
      },
      'Application handled error'
    );

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Unexpected errors
  logger.error(
    {
      err,
      path: req.path,
      method: req.method,
      stack: env.NODE_ENV !== 'production' ? err.stack : undefined,
    },
    'Unhandled server exception'
  );

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        env.NODE_ENV === 'production'
          ? 'An internal error occurred. Traffic signal state has been preserved.'
          : err.message || 'Internal server error',
    },
  });
}
