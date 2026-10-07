import { z } from 'zod';
import { patientInfoSchema } from './patient.schema';
import { missionStatusSchema, emergencyLevelSchema } from './common.schema';

export const createMissionSchema = z
  .object({
    ambulance_id: z.string().uuid({ message: 'Valid ambulance ID required' }),
    hospital_id: z.string().uuid({ message: 'Valid hospital ID required' }),
    origin_lat: z
      .number()
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90'),
    origin_lng: z
      .number()
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180'),
    patient_info: patientInfoSchema,
  })
  .strict();

export const updateMissionStatusSchema = z.object({
  status: missionStatusSchema,
});

export const missionFilterSchema = z.object({
  status: missionStatusSchema.optional(),
  level: emergencyLevelSchema.optional(),
  ambulance_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateMissionInput = z.infer<typeof createMissionSchema>;
export type UpdateMissionStatusInput = z.infer<typeof updateMissionStatusSchema>;
