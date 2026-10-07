import { z } from 'zod';

export const routeComputeSchema = z
  .object({
    origin_lat: z.number().min(-90).max(90),
    origin_lng: z.number().min(-180).max(180),
    hospital_id: z.string().uuid({ message: 'Valid hospital ID required' }),
  })
  .strict();

export type RouteComputeInput = z.infer<typeof routeComputeSchema>;
