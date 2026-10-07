import { z } from 'zod';
import {
  USER_ROLES,
  EMERGENCY_LEVELS,
  MISSION_STATUSES,
  CROSSING_STATES,
  APPROACHES,
  MOVEMENTS,
  SIGNAL_COLORS,
  JUNCTION_MODES,
  OVERRIDE_STATUSES,
  DETECTION_SOURCES,
  DENSITY_LEVELS,
} from '../constants';

export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid UUID format' }),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const roleSchema = z.enum(USER_ROLES);
export const emergencyLevelSchema = z.enum(EMERGENCY_LEVELS);
export const missionStatusSchema = z.enum(MISSION_STATUSES);
export const crossingStateSchema = z.enum(CROSSING_STATES);
export const approachSchema = z.enum(APPROACHES);
export const signalColorSchema = z.enum(SIGNAL_COLORS);
export const junctionModeSchema = z.enum(JUNCTION_MODES);
export const overrideStatusSchema = z.enum(OVERRIDE_STATUSES);
export const detectionSourceSchema = z.enum(DETECTION_SOURCES);
export const densityLevelSchema = z.enum(DENSITY_LEVELS);

export const movementSchema = z.enum(MOVEMENTS);
