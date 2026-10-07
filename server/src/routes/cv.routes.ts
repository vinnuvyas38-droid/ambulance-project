import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { analyzeFrameSchema, CvDetection } from '@green-corridor/shared';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { aiRateLimiter } from '../middleware/rateLimit.middleware';
import { GeminiDetector } from '../services/cv.geminiDetector';
import { store } from '../lib/store';
import { AuditService } from '../services/audit.service';

export const cvRouter = Router();
const detector = new GeminiDetector();

cvRouter.post(
  '/cv/analyze-frame',
  authMiddleware,
  requireRole('admin', 'operator'),
  aiRateLimiter,
  validateBody(analyzeFrameSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { image, approach, junction_id } = req.body;
      const jId = junction_id || Array.from(store.junctions.keys())[0];

      const analysis = await detector.analyzeFrame(jId, approach, image);

      // Persist detection record
      let densityLevel: any = 'free';
      if (analysis.density_pct > 75) densityLevel = 'jammed';
      else if (analysis.density_pct > 50) densityLevel = 'heavy';
      else if (analysis.density_pct > 25) densityLevel = 'moderate';

      const detectionRecord: CvDetection = {
        id: uuidv4(),
        junction_id: jId,
        approach,
        source: 'gemini',
        detections: analysis.detections,
        vehicle_count: analysis.vehicle_count,
        density_pct: analysis.density_pct,
        density: densityLevel,
        ambulance_detected: analysis.ambulance_detected,
        ambulance_direction: analysis.ambulance_direction,
        crossing: analysis.crossing_state,
        confidence: analysis.confidence,
        created_at: new Date().toISOString(),
      };

      store.cv_detections.set(detectionRecord.id, detectionRecord);

      AuditService.log(
        'cv_frame_analyzed',
        'cv',
        {
          junction_id: jId,
          approach,
          ambulance_detected: analysis.ambulance_detected,
          vehicle_count: analysis.vehicle_count,
        },
        'user',
        req.user!.id,
        detectionRecord.id
      );

      res.json({ data: analysis });
    } catch (err) {
      next(err);
    }
  }
);

cvRouter.get('/cv/detections', authMiddleware, (req: Request, res: Response) => {
  const { junction_id } = req.query;
  let detections = Array.from(store.cv_detections.values());

  if (junction_id) {
    detections = detections.filter((d) => d.junction_id === junction_id);
  }

  detections.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ data: detections.slice(0, 50) });
});
