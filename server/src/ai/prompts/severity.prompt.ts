import { PatientInfoInput } from '@green-corridor/shared';
import { BASE_SYSTEM_PROMPT } from '../systemPrompt';

export function buildSeverityPrompt(patientInfo: PatientInfoInput): {
  systemInstruction: string;
  userPrompt: string;
} {
  // Sanitize free-text fields
  const sanitized = {
    ...patientInfo,
    trauma_mechanism: (patientInfo.trauma_mechanism || '')
      .replace(/[<>]/g, '')
      .slice(0, 200),
    notes: (patientInfo.notes || '').replace(/[<>]/g, '').slice(0, 500),
  };

  const systemInstruction = `${BASE_SYSTEM_PROMPT}

TASK: Assess the emergency severity for routing priority.
Score from 0 to 100 using these guidelines:
- 85–100 critical: immediately life-threatening (absent/shallow breathing, unresponsive, severe bleeding, stroke signs with time-critical onset, cardiac arrest indicators).
- 70–84 high: serious, rapidly deteriorating risk (chest pain with abnormal vitals, labored breathing, confusion with trauma).
- 50–69 medium: urgent but stable.
- 0–49 low: non-life-threatening.
The "severity_level" MUST be consistent with "severity_score" per the ranges above.
Give up to 5 short key_reasons referencing the input fields.`;

  const userPrompt = `<user_data>
${JSON.stringify(sanitized, null, 2)}
</user_data>`;

  return { systemInstruction, userPrompt };
}
