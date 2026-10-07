import { Router, Request, Response } from 'express';
import { store } from '../lib/store';

export const hospitalRouter = Router();

hospitalRouter.get('/hospitals', (_req: Request, res: Response) => {
  const hospitals = Array.from(store.hospitals.values()).filter((h) => h.is_active);
  res.json({ data: hospitals });
});
