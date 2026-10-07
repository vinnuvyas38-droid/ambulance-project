export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(404, 'NOT_FOUND', message, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: unknown) {
    super(401, 'UNAUTHORIZED', message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden: Insufficient privileges', details?: unknown) {
    super(403, 'FORBIDDEN', message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict detected', details?: unknown) {
    super(409, 'CONFLICT', message, details);
  }
}

export class SafetyViolationError extends AppError {
  constructor(message = 'Safety Validator rejected command: Conflicting movements or invalid state', details?: unknown) {
    super(422, 'SAFETY_VIOLATION', message, details);
  }
}

export class AiValidationError extends AppError {
  constructor(message = 'AI output failed structural validation after retries', details?: unknown) {
    super(502, 'AI_VALIDATION_ERROR', message, details);
  }
}
