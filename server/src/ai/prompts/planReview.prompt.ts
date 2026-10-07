import { BASE_SYSTEM_PROMPT } from '../systemPrompt';

export function buildPlanReviewPrompt(plan: unknown, cvContext: unknown): {
  systemInstruction: string;
  userPrompt: string;
} {
  const systemInstruction = `${BASE_SYSTEM_PROMPT}

TASK: Review the proposed emergency signal plan for contextual risks. The plan has already passed the deterministic conflict check. Identify practical risks (queue spillback, pedestrians, heavy cross-traffic, low-confidence CV) and give a risk level.`;

  const userPrompt = `<plan>${JSON.stringify(plan, null, 2)}</plan>
<cv_context>${JSON.stringify(cvContext, null, 2)}</cv_context>`;

  return { systemInstruction, userPrompt };
}
