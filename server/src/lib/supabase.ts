import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { logger } from './logger';

export const isRealSupabase =
  Boolean(env.SUPABASE_URL) &&
  !env.SUPABASE_URL.includes('mock-greencorridor') &&
  Boolean(env.SUPABASE_SERVICE_ROLE_KEY) &&
  !env.SUPABASE_SERVICE_ROLE_KEY.includes('mock-');

export let supabaseAdmin: SupabaseClient | null = null;

if (isRealSupabase) {
  try {
    supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    logger.info('Connected to remote Supabase instance');
  } catch (err) {
    logger.warn({ err }, 'Failed to initialize Supabase client, falling back to local memory store');
  }
} else {
  logger.info('Using high-performance local memory database & event store');
}

export function createUserScopedSupabase(jwtToken: string): SupabaseClient {
  if (isRealSupabase && supabaseAdmin) {
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      },
      auth: { persistSession: false },
    });
  }
  // Return dummy client if in mock mode
  return createClient('https://mock-greencorridor.supabase.co', 'mock-key', {
    auth: { persistSession: false },
  });
}
