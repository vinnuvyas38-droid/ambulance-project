import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../lib/errors';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const formatted = (result.error as ZodError).format();
      return next(new BadRequestError('Validation failed on request body', formatted));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const formatted = (result.error as ZodError).format();
      return next(new BadRequestError('Validation failed on query parameters', formatted));
    }
    req.query = result.data as any;
    next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const formatted = (result.error as ZodError).format();
      return next(new BadRequestError('Validation failed on route parameters', formatted));
    }
    req.params = result.data as any;
    next();
  };
}
