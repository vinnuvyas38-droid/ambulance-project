import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.NODE_ENV === 'development' ? 5000 : env.RATE_LIMIT_GLOBAL_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again shortly.',
    },
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.RATE_LIMIT_AUTH_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again shortly.',
    },
  },
});

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.RATE_LIMIT_AI_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per user if authenticated, else IP
    return req.user?.id || req.ip || 'anonymous';
  },
  message: {
    error: {
      code: 'AI_RATE_LIMIT_EXCEEDED',
      message: 'AI decision-support request limit reached, please wait a moment.',
    },
  },
});
