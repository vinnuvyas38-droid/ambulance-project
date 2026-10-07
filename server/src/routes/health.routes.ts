import { Router, Request, Response } from 'express';
import { isRealSupabase } from '../lib/supabase';
import { isRealGemini, MODEL } from '../services/gemini.client';
import { store } from '../lib/store';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: isRealSupabase ? 'connected-supabase' : 'in-memory-synchronized',
      gemini: isRealGemini ? `configured (${MODEL})` : 'rule-based-fallback-ready',
      simulation: {
        running: store.simulation_state.running,
        tick: store.simulation_state.tick,
        speed: store.simulation_state.speed_multiplier,
      },
    },
  });
});
