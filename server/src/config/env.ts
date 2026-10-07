import dotenv from 'dotenv';
import path from 'path';
import { serverEnvSchema, ServerEnv } from '@green-corridor/shared';

// Load .env from current directory or parent
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ CRITICAL: Invalid or missing server environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  // In development, provide fallback defaults for convenience if needed, but fail fast if critical
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Fallback defaults for seamless development/testing
export const env: ServerEnv = parsed.success
  ? parsed.data
  : {
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      PORT: Number(process.env.PORT) || 4000,
      CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      LOG_LEVEL: (process.env.LOG_LEVEL as any) || 'info',
      SUPABASE_URL: process.env.SUPABASE_URL || 'https://mock-greencorridor.supabase.co',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'mock-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'mock-gemini-key',
      GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      GEMINI_TEXT_TIMEOUT_MS: Number(process.env.GEMINI_TEXT_TIMEOUT_MS) || 8000,
      GEMINI_VISION_TIMEOUT_MS: Number(process.env.GEMINI_VISION_TIMEOUT_MS) || 12000,
      AI_MAX_CONCURRENCY: Number(process.env.AI_MAX_CONCURRENCY) || 4,
      RATE_LIMIT_GLOBAL_PER_MIN: Number(process.env.RATE_LIMIT_GLOBAL_PER_MIN) || 100,
      RATE_LIMIT_AUTH_PER_MIN: Number(process.env.RATE_LIMIT_AUTH_PER_MIN) || 10,
      RATE_LIMIT_AI_PER_MIN: Number(process.env.RATE_LIMIT_AI_PER_MIN) || 20,
      SIM_TICK_MS: Number(process.env.SIM_TICK_MS) || 500,
      SIM_AUTOSTART: process.env.SIM_AUTOSTART === 'true',
    };
