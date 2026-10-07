import { z } from 'zod';
import { movementSchema } from './common.schema';

export const signalPhaseSchema = z.object({
  order: z.number().int().min(1),
  movements: z.array(movementSchema).min(1),
  green_seconds: z.number().int().min(1),
  yellow_seconds: z.number().int().min(1),
  all_red_seconds: z.number().int().min(0),
});

export const signalPlanSchema = z.object({
  phases: z.array(signalPhaseSchema).min(1),
});

export const overrideRequestSchema = z
  .object({
    mission_id: z.string().uuid({ message: 'Valid mission ID required' }),
    movement: movementSchema,
    planned_green_seconds: z
      .number()
      .int()
      .min(5, 'Minimum green override is 5 seconds')
      .max(60, 'Maximum green override is 60 seconds')
      .optional()
      .default(15),
  })
  .strict();

export type SignalPhase = z.infer<typeof signalPhaseSchema>;
export type SignalPlan = z.infer<typeof signalPlanSchema>;
export type OverrideRequestInput = z.infer<typeof overrideRequestSchema>;
