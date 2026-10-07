import { Approach } from '@green-corridor/shared';
import { BASE_SYSTEM_PROMPT } from '../systemPrompt';

export function buildCvFramePrompt(approach: Approach): {
  systemInstruction: string;
  userPrompt: string;
} {
  const systemInstruction = `${BASE_SYSTEM_PROMPT}

TASK: Analyze this traffic-junction camera frame (approach: ${approach}).
1. List every visible vehicle with label (ambulance|car|truck|bus|bike|auto_rickshaw|pedestrian), confidence (0–1), and bounding box as [x, y, width, height] normalized 0–1.
2. Mark an ambulance ONLY if clear ambulance cues are visible (e.g., cross/"AMBULANCE" marking, emergency light bar, ambulance body shape). If uncertain, do not label it ambulance.
3. Estimate traffic density_pct (0–100) = share of the visible road area occupied by vehicles.
4. If an ambulance is present, estimate its direction of travel as the approach it is coming FROM (N|E|S|W) using its orientation, or null if unclear.
5. If an ambulance is present, set crossing_state: approaching (before stop line), entering (crossing stop line), inside (within the junction box), cleared (fully past the junction box). Otherwise "not_detected".
6. Set needs_fallback=true if the image is too dark, blurred, or unusable.`;

  const userPrompt = `Analyze the camera frame from approach ${approach}. Provide structured JSON according to the schema.`;

  return { systemInstruction, userPrompt };
}
