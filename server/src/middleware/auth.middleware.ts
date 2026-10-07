import { Request, Response, NextFunction } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { Profile, UserRole } from '@green-corridor/shared';
import { UnauthorizedError } from '../lib/errors';
import { isRealSupabase, supabaseAdmin, createUserScopedSupabase } from '../lib/supabase';
import { store } from '../lib/store';
import { logger } from '../lib/logger';

declare global {
  namespace Express {
    interface Request {
      user?: Profile;
      supabase?: SupabaseClient;
      requestId?: string;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.split(' ')[1]?.trim();
  if (!token) {
    return next(new UnauthorizedError('Authorization token required'));
  }

  // Support demo / mock fast authentication tokens for hackathon / offline simulation
  if (token.startsWith('mock-') || !isRealSupabase) {
    const roleMatch = token.replace('mock-', '').replace('-token', '').toLowerCase() as UserRole;
    let matchedProfile = Array.from(store.profiles.values()).find(
      (p) => p.role === roleMatch
    );

    if (!matchedProfile) {
      // Default fallback to operator or viewer
      matchedProfile = Array.from(store.profiles.values())[0];
    }

    req.user = matchedProfile;
    req.supabase = createUserScopedSupabase(token);
    return next();
  }

  // Real Supabase JWT verification
  try {
    if (!supabaseAdmin) {
      return next(new UnauthorizedError('Supabase authentication service unavailable'));
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      logger.warn({ error }, 'Failed Supabase token verification');
      return next(new UnauthorizedError('Invalid or expired authentication token'));
    }

    // Load profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // Create viewer profile if not exists
      const newProfile: Profile = {
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Emergency System User',
        role: (user.user_metadata?.role as UserRole) || 'viewer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await supabaseAdmin.from('profiles').insert(newProfile);
      req.user = newProfile;
    } else {
      req.user = profile as Profile;
    }

    req.supabase = createUserScopedSupabase(token);
    return next();
  } catch (err) {
    logger.error({ err }, 'Error in authMiddleware');
    return next(new UnauthorizedError('Authentication verification failed'));
  }
}
