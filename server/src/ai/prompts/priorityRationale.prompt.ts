import { BASE_SYSTEM_PROMPT } from '../systemPrompt';

export function buildPriorityRationalePrompt(context: {
  junction: unknown;
  candidates: unknown;
  ranking: unknown;
  schedule: unknown;
}): {
  systemInstruction: string;
  userPrompt: string;
} {
  const systemInstruction = `${BASE_SYSTEM_PROMPT}

TASK: You are given the deterministic priority analysis for a junction. Verify it and explain it for traffic operators in 2–4 sentences. Flag any concern. Do not change the schedule unless a clear error exists.`;

  const userPrompt = `<junction_context>
${JSON.stringify(context.junction, null, 2)}
</junction_context>
<candidates>
${JSON.stringify(context.candidates, null, 2)}
</candidates>
<computed_ranking>
${JSON.stringify(context.ranking, null, 2)}
</computed_ranking>
<computed_schedule>
${JSON.stringify(context.schedule, null, 2)}
</computed_schedule>`;

  return { systemInstruction, userPrompt };
}
