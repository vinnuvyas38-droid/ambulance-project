import { z } from 'zod';
import {
  EMERGENCY_LEVELS,
  EMERGENCY_CATEGORIES,
  VEHICLE_CLASSES,
  APPROACHES,
  CROSSING_STATES,
} from '../constants';
import { bboxSchema } from './cv.schema';

// 1. Emergency Severity Assessment
export const severityAssessmentSchema = z
  .object({
    severity_score: z.number().int().min(0).max(100),
    severity_level: z.enum(EMERGENCY_LEVELS),
    category: z.enum(EMERGENCY_CATEGORIES),
    key_reasons: z.array(z.string().min(1)).max(5),
    recommended_hospital_capabilities: z.array(z.string().min(1)).max(5),
    time_critical_window_minutes: z.number().int().min(0).max(240),
    confidence: z.number().min(0).max(1),
    disclaimer: z.string().min(1),
  })
  .strict()
  .refine(
    (data) => {
      const score = data.severity_score;
      if (score >= 85) return data.severity_level === 'critical';
      if (score >= 70) return data.severity_level === 'high';
      if (score >= 50) return data.severity_level === 'medium';
      return data.severity_level === 'low';
    },
    {
      message:
        'severity_level must strictly match severity_score range (85-100: critical, 70-84: high, 50-69: medium, 0-49: low)',
    }
  );

// 2. Computer Vision Frame Analysis
export const cvFrameAnalysisSchema = z
  .object({
    detections: z.array(
      z.object({
        label: z.enum(VEHICLE_CLASSES),
        confidence: z.number().min(0).max(1),
        bbox: bboxSchema,
      })
    ),
    vehicle_count: z.number().int().min(0),
    density_pct: z.number().int().min(0).max(100),
    ambulance_detected: z.boolean(),
    ambulance_direction: z.enum(APPROACHES).nullable(),
    crossing_state: z.enum(CROSSING_STATES),
    confidence: z.number().min(0).max(1),
    needs_fallback: z.boolean(),
    summary: z.string(),
  })
  .strict()
  .transform((data) => {
    // Normalization & consistency enforcement
    const hasAmbulance = data.detections.some((d) => d.label === 'ambulance');
    const ambulanceDetected = data.ambulance_detected || hasAmbulance;

    return {
      ...data,
      vehicle_count: data.detections.length,
      ambulance_detected: ambulanceDetected,
      ambulance_direction: ambulanceDetected ? data.ambulance_direction : null,
      crossing_state: ambulanceDetected ? data.crossing_state : 'not_detected',
    };
  });

// 3. Multi-Ambulance Priority Rationale
export const priorityRationaleSchema = z
  .object({
    agrees_with_ranking: z.boolean(),
    rationale: z.string(),
    concerns: z.array(z.string()).max(5),
    suggested_ranking_mission_ids: z.array(z.string()).nullable(),
    needs_fallback: z.boolean(),
  })
  .strict();

// 4. Signal Plan Safety Review
export const signalPlanReviewSchema = z
  .object({
    risk_level: z.enum(['low', 'medium', 'high']),
    warnings: z.array(z.string()).max(5),
    recommended_green_seconds: z.number().int().min(8).max(30),
    needs_fallback: z.boolean(),
  })
  .strict();

// 5. Mission Report Summary
export const missionSummarySchema = z
  .object({
    headline: z.string(),
    summary: z.string(),
    highlights: z.array(z.string()).max(5),
    issues: z.array(z.string()).max(5),
  })
  .strict();

export type SeverityAssessment = z.infer<typeof severityAssessmentSchema>;
export type CvFrameAnalysis = z.infer<typeof cvFrameAnalysisSchema>;
export type PriorityRationale = z.infer<typeof priorityRationaleSchema>;
export type SignalPlanReview = z.infer<typeof signalPlanReviewSchema>;
export type MissionSummary = z.infer<typeof missionSummarySchema>;
