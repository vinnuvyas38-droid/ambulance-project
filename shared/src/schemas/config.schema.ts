import { z } from 'zod';

export const configSchema = z
  .object({
    w_severity: z.number().min(0).max(1),
    w_eta: z.number().min(0).max(1),
    w_waiting: z.number().min(0).max(1),
    w_conflict_cost: z.number().min(0).max(1),
    w_route_requirement: z.number().min(0).max(1),
    arming_distance_m: z.number().int().min(50).max(1000),
    yellow_seconds: z.number().int().min(2).max(10),
    all_red_seconds: z.number().int().min(1).max(10),
    min_green_seconds: z.number().int().min(5).max(30),
    max_green_seconds: z.number().int().min(15).max(120),
    clear_confirm_frames: z.number().int().min(1).max(10),
    cv_timeout_seconds: z.number().int().min(2).max(30),
  })
  .strict()
  .refine(
    (cfg) => {
      const sum =
        cfg.w_severity +
        cfg.w_eta +
        cfg.w_waiting +
        cfg.w_conflict_cost +
        cfg.w_route_requirement;
      return Math.abs(sum - 1.0) <= 0.001;
    },
    {
      message: 'Priority weights (w_severity, w_eta, w_waiting, w_conflict_cost, w_route_requirement) must sum to 1.0',
    }
  )
  .refine((cfg) => cfg.min_green_seconds <= cfg.max_green_seconds, {
    message: 'min_green_seconds cannot exceed max_green_seconds',
  });

export type PriorityConfig = z.infer<typeof configSchema>;
