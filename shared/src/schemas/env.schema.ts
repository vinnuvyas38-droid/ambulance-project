import { z } from 'zod';

export const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  SUPABASE_URL: z.string().url({ message: 'Valid SUPABASE_URL is required' }),
  SUPABASE_ANON_KEY: z
    .string()
    .min(1, { message: 'SUPABASE_ANON_KEY is required' }),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, { message: 'SUPABASE_SERVICE_ROLE_KEY is required' }),

  GEMINI_API_KEY: z.string().min(1, { message: 'GEMINI_API_KEY is required' }),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  GEMINI_TEXT_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  GEMINI_VISION_TIMEOUT_MS: z.coerce.number().int().positive().default(12000),
  AI_MAX_CONCURRENCY: z.coerce.number().int().positive().default(4),

  RATE_LIMIT_GLOBAL_PER_MIN: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_AUTH_PER_MIN: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_AI_PER_MIN: z.coerce.number().int().positive().default(20),

  SIM_TICK_MS: z.coerce.number().int().positive().default(500),
  SIM_AUTOSTART: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
