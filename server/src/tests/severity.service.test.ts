import { describe, it, expect } from 'vitest';
import { SeverityService } from '../services/severity.service';
import { PatientInfoInput } from '@green-corridor/shared';

describe('SeverityService (Rule-Based Fallback)', () => {
  it('correctly classifies a critical multi-trauma patient as Tier 1 Critical (score >= 85)', () => {
    const criticalPatient: PatientInfoInput = {
      emergency_category: 'trauma_accident',
      age_band: 'adult',
      consciousness: 'unresponsive',
      breathing: 'shallow',
      severe_bleeding: true,
      chest_pain: false,
      stroke_signs: false,
      heart_rate: 145,
      systolic_bp: 80,
      spo2: 85,
      trauma_mechanism: 'Rollover vehicle ejection',
      notes: 'Unresponsive at scene, active arterial bleeding',
    };

    const assessment = SeverityService.assessRuleBased(criticalPatient);
    expect(assessment.severity_score).toBeGreaterThanOrEqual(85);
    expect(assessment.severity_level).toBe('critical');
    expect(assessment.recommended_hospital_capabilities).toContain('trauma');
    expect(assessment.time_critical_window_minutes).toBeLessThanOrEqual(15);
  });

  it('correctly classifies a stable non-emergent patient as Low severity', () => {
    const stablePatient: PatientInfoInput = {
      emergency_category: 'other',
      age_band: 'adult',
      consciousness: 'alert',
      breathing: 'normal',
      severe_bleeding: false,
      chest_pain: false,
      stroke_signs: false,
      heart_rate: 72,
      systolic_bp: 120,
      spo2: 98,
      notes: 'Mild wrist sprain after fall',
      trauma_mechanism: ''
    };

    const assessment = SeverityService.assessRuleBased(stablePatient);
    expect(assessment.severity_score).toBeLessThan(50);
    expect(assessment.severity_level).toBe('low');
    expect(assessment.disclaimer).toContain('decision support');
  });
});
