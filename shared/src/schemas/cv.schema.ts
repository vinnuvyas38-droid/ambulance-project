import { z } from 'zod';
import { APPROACHES, VEHICLE_CLASSES } from '../constants';

export const analyzeFrameSchema = z
  .object({
    image: z.string().min(1, 'Image data (base64) is required'),
    approach: z.enum(APPROACHES),
    mimeType: z
      .enum(['image/jpeg', 'image/png', 'image/webp'])
      .default('image/jpeg'),
    junction_id: z.string().uuid().optional(),
  })
  .strict();

export const bboxSchema = z.tuple([
  z.number().min(0).max(1),
  z.number().min(0).max(1),
  z.number().min(0).max(1),
  z.number().min(0).max(1),
]);

export const detectionItemSchema = z.object({
  label: z.enum(VEHICLE_CLASSES),
  confidence: z.number().min(0).max(1),
  bbox: bboxSchema,
});

export type AnalyzeFrameInput = z.infer<typeof analyzeFrameSchema>;
export type DetectionItem = z.infer<typeof detectionItemSchema>;
