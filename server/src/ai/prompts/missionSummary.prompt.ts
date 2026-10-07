import { BASE_SYSTEM_PROMPT } from '../systemPrompt';

export function buildMissionSummaryPrompt(metrics: unknown): {
  systemInstruction: string;
  userPrompt: string;
} {
  const systemInstruction = `${BASE_SYSTEM_PROMPT}

TASK: Write a concise operator-facing mission summary from the provided metrics and event timeline. Include junctions cleared, time saved versus fixed-time baseline, conflicts resolved, and any fail-safe events. Use only provided data.`;

  const userPrompt = `<mission_metrics>${JSON.stringify(metrics, null, 2)}</mission_metrics>`;

  return { systemInstruction, userPrompt };
}
