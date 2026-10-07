import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@green-corridor/shared';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden: Requires role in [${allowedRoles.join(', ')}], but current user is '${req.user.role}'`
        )
      );
    }

    next();
  };
}
