import { z } from 'zod';

export const simulationSpeedSchema = z.object({
  speed: z.union([z.literal(1), z.literal(2), z.literal(4)]),
});

export const scenarioSchema = z.object({
  scenario: z.string().min(1, 'Scenario name is required'),
});

export type SimulationSpeedInput = z.infer<typeof simulationSpeedSchema>;
export type ScenarioInput = z.infer<typeof scenarioSchema>;
