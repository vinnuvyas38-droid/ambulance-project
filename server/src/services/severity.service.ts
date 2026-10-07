import {
  PatientInfoInput,
  SeverityAssessment,
  severityAssessmentSchema,
  EmergencyLevel,
} from '@green-corridor/shared';
import { generateStructured } from './gemini.client';
import { buildSeverityPrompt } from '../ai/prompts/severity.prompt';
import { logger } from '../lib/logger';

export class SeverityService {
  /**
   * Deterministic rule-based fallback assessment engine.
   * Ensures the system always works reliably even without network or AI availability.
   */
  static assessRuleBased(patientInfo: PatientInfoInput): SeverityAssessment {
    let score = 10;
    const reasons: string[] = [];
    const capabilities: string[] = ['general_emergency'];

    // 1. Breathing evaluation
    if (patientInfo.breathing === 'absent') {
      score += 50;
      reasons.push('Respiratory arrest / absent breathing (immediate life threat)');
      capabilities.push('icu', 'respiratory');
    } else if (patientInfo.breathing === 'shallow') {
      score += 35;
      reasons.push('Critically shallow breathing indicates hypoxemia risk');
      capabilities.push('respiratory');
    } else if (patientInfo.breathing === 'labored') {
      score += 20;
      reasons.push('Labored breathing observed');
    }

    // 2. Consciousness evaluation
    if (patientInfo.consciousness === 'unresponsive') {
      score += 40;
      reasons.push('Patient unresponsive to verbal and painful stimuli');
      capabilities.push('icu', 'neurology');
    } else if (patientInfo.consciousness === 'responds_to_pain') {
      score += 25;
      reasons.push('Decreased level of consciousness (responds only to pain)');
    } else if (patientInfo.consciousness === 'confused') {
      score += 15;
      reasons.push('Altered mental state / confusion');
    }

    // 3. Bleeding
    if (patientInfo.severe_bleeding) {
      score += 30;
      reasons.push('Active severe hemorrhage reported');
      capabilities.push('trauma');
    }

    // 4. Cardiac indicators
    if (patientInfo.chest_pain) {
      score += 25;
      reasons.push('Acute chest pain / possible acute coronary syndrome');
      capabilities.push('cardiac');
    }

    // 5. Stroke signs
    if (patientInfo.stroke_signs) {
      score += 30;
      reasons.push('Positive stroke indicators present within acute thrombolytic window');
      capabilities.push('stroke', 'neurology');
    }

    // 6. Objective Vitals check
    if (patientInfo.spo2 && patientInfo.spo2 < 90) {
      score += 15;
      reasons.push(`Hypoxia recorded (SpO2 ${patientInfo.spo2}%)`);
    }
    if (patientInfo.heart_rate && (patientInfo.heart_rate > 130 || patientInfo.heart_rate < 45)) {
      score += 15;
      reasons.push(`Hemodynamic instability (HR ${patientInfo.heart_rate} bpm)`);
    }

    // Clamp score to [0, 100]
    const finalScore = Math.max(0, Math.min(100, score));

    // Determine level strictly consistent with score
    let level: EmergencyLevel = 'low';
    let timeWindow = 120;

    if (finalScore >= 85) {
      level = 'critical';
      timeWindow = 15;
    } else if (finalScore >= 70) {
      level = 'high';
      timeWindow = 30;
    } else if (finalScore >= 50) {
      level = 'medium';
      timeWindow = 60;
    }

    if (reasons.length === 0) {
      reasons.push('Stable vital signs and patient presentation');
    }

    return {
      severity_score: finalScore,
      severity_level: level,
      category: patientInfo.emergency_category,
      key_reasons: reasons.slice(0, 5),
      recommended_hospital_capabilities: Array.from(new Set(capabilities)).slice(0, 5),
      time_critical_window_minutes: timeWindow,
      confidence: 0.95,
      disclaimer:
        'This score is decision support for emergency corridor routing only and does not constitute a clinical medical diagnosis.',
    };
  }

  /**
   * Evaluates patient info via Gemini AI with automatic graceful fallback.
   */
  static async assess(
    patientInfo: PatientInfoInput
  ): Promise<{ assessment: SeverityAssessment; model: string; latency_ms: number }> {
    const startTime = Date.now();
    try {
      const { systemInstruction, userPrompt } = buildSeverityPrompt(patientInfo);
      const aiResult = await generateStructured(severityAssessmentSchema, {
        systemInstruction,
        userPrompt,
        temperature: 0.1,
      });

      return {
        assessment: aiResult.data,
        model: aiResult.model,
        latency_ms: aiResult.latency_ms,
      };
    } catch (err: any) {
      logger.warn(
        { error: err.message },
        'Gemini assessment unavailable or failed validation; engaging deterministic rule-based fallback'
      );
      const fallbackAssessment = this.assessRuleBased(patientInfo);
      return {
        assessment: fallbackAssessment,
        model: 'rule-based-fallback',
        latency_ms: Date.now() - startTime,
      };
    }
  }
}
