import { z } from 'zod';
import {
  AGE_BANDS,
  CONSCIOUSNESS_LEVELS,
  BREATHING_LEVELS,
  EMERGENCY_CATEGORIES,
} from '../constants';

export const patientInfoSchema = z
  .object({
    emergency_category: z.enum(EMERGENCY_CATEGORIES),
    age_band: z.enum(AGE_BANDS),
    consciousness: z.enum(CONSCIOUSNESS_LEVELS),
    breathing: z.enum(BREATHING_LEVELS),
    severe_bleeding: z.boolean(),
    chest_pain: z.boolean(),
    stroke_signs: z.boolean(),
    trauma_mechanism: z
      .string()
      .trim()
      .max(200, 'Trauma mechanism description cannot exceed 200 characters')
      .optional()
      .default(''),
    heart_rate: z
      .number()
      .int()
      .min(0, 'Heart rate cannot be negative')
      .max(250, 'Heart rate exceeds biological maximum')
      .optional()
      .nullable(),
    systolic_bp: z
      .number()
      .int()
      .min(0, 'Blood pressure cannot be negative')
      .max(300, 'Systolic BP exceeds maximum')
      .optional()
      .nullable(),
    spo2: z
      .number()
      .int()
      .min(0, 'SpO2 must be at least 0%')
      .max(100, 'SpO2 cannot exceed 100%')
      .optional()
      .nullable(),
    notes: z
      .string()
      .trim()
      .max(500, 'Notes cannot exceed 500 characters')
      .optional()
      .default(''),
  })
  .strict();

export type PatientInfoInput = z.infer<typeof patientInfoSchema>;
