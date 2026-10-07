import { v4 as uuidv4 } from 'uuid';
import {
  PriorityCandidate,
  PriorityDecision,
  PrioritySchedulePhase,
  PriorityConfig,
  DEFAULT_PRIORITY_CONFIG,
  Movement,
  priorityRationaleSchema,
} from '@green-corridor/shared';
import { store } from '../lib/store';
import { SafetyValidator } from './safety.validator';
import { generateStructured } from './gemini.client';
import { buildPriorityRationalePrompt } from '../ai/prompts/priorityRationale.prompt';
import { logger } from '../lib/logger';

export class PriorityEngine {
  /**
   * Evaluates multiple candidate ambulances at a junction using the deterministic formula
   */
  static evaluateJunction(
    junctionId: string,
    customCandidates?: Array<{
      mission_id: string;
      ambulance_call_sign: string;
      severity_score: number;
      eta_seconds: number;
      waiting_seconds: number;
      movement: Movement;
      is_authorized?: boolean;
    }>
  ): PriorityDecision {
    const junction = store.junctions.get(junctionId);
    if (!junction) {
      throw new Error(`Junction ${junctionId} does not exist`);
    }

    const config: PriorityConfig =
      store.system_config.get('priority_weights')?.value || DEFAULT_PRIORITY_CONFIG;

    // 1. Gather candidates
    let rawCandidates = customCandidates;

    if (!rawCandidates || rawCandidates.length === 0) {
      // Collect active missions approaching this junction from store
      rawCandidates = [];
      for (const m of store.missions.values()) {
        if (['en_route', 'approaching_junction', 'crossing'].includes(m.status)) {
          const amb = store.ambulances.get(m.ambulance_id);
          const rj = Array.from(store.route_junctions.values()).find(
            (r) => r.route_id === m.route_id && r.junction_id === junctionId
          );
          if (rj && amb) {
            const movement = `${rj.entry_approach}_${rj.exit_approach}` as Movement;
            rawCandidates.push({
              mission_id: m.id,
              ambulance_call_sign: amb.call_sign,
              severity_score: m.severity_score || 50,
              eta_seconds: m.eta_seconds || 30,
              waiting_seconds: m.status === 'approaching_junction' ? 15 : 0,
              movement,
              is_authorized: amb.is_authorized,
            });
          }
        }
      }
    }

    if (rawCandidates.length === 0) {
      // Empty decision
      const emptyDecision: PriorityDecision = {
        id: uuidv4(),
        junction_id: junctionId,
        candidates: [],
        ranking: [],
        schedule: [],
        safety_validated: true,
        ai_rationale: 'No emergency vehicles currently approaching this junction.',
        ai_model: 'deterministic-rules',
        created_at: new Date().toISOString(),
      };
      store.priority_decisions.set(emptyDecision.id, emptyDecision);
      return emptyDecision;
    }

    // 2. Compute factor scores per candidate
    const candidateCount = rawCandidates.length;

    const evaluatedCandidates: PriorityCandidate[] = rawCandidates.map((c) => {
      const [entry, exit] = c.movement.split('_') as any;

      // Severity factor
      const f_severity = c.severity_score / 100;

      // ETA factor: closer arrival (lower eta) gives higher score
      const f_eta = 1 - Math.min(Math.max(0, c.eta_seconds), 120) / 120;

      // Waiting factor
      const f_waiting = Math.min(Math.max(0, c.waiting_seconds), 60) / 60;

      // Conflict cost factor: share of OTHER candidates' movements this movement conflicts with
      let conflictingCount = 0;
      if (candidateCount > 1) {
        rawCandidates!.forEach((other) => {
          if (other.mission_id !== c.mission_id) {
            if (SafetyValidator.areMovementsConflicting(junctionId, c.movement, other.movement)) {
              conflictingCount++;
            }
          }
        });
      }
      const normalizedConflictCost = candidateCount > 1 ? conflictingCount / (candidateCount - 1) : 0;
      const f_conflict_cost = 1 - normalizedConflictCost;

      // Route requirement score: 1.0 if bottleneck
      const f_route_req = 1.0;

      // Deterministic Weighted Formula
      const final_score = Number(
        (
          config.w_severity * f_severity +
          config.w_eta * f_eta +
          config.w_waiting * f_waiting +
          config.w_conflict_cost * f_conflict_cost +
          config.w_route_requirement * f_route_req
        ).toFixed(4)
      );

      let level: any = 'low';
      if (c.severity_score >= 85) level = 'critical';
      else if (c.severity_score >= 70) level = 'high';
      else if (c.severity_score >= 50) level = 'medium';

      return {
        mission_id: c.mission_id,
        ambulance_call_sign: c.ambulance_call_sign,
        severity_score: c.severity_score,
        severity_level: level,
        eta_seconds: c.eta_seconds,
        waiting_seconds: c.waiting_seconds,
        entry_approach: entry,
        exit_approach: exit,
        movement: c.movement,
        is_authorized: c.is_authorized ?? true,
        route_requirement_score: f_route_req,
        factor_scores: {
          severity: Number(f_severity.toFixed(2)),
          eta: Number(f_eta.toFixed(2)),
          waiting: Number(f_waiting.toFixed(2)),
          conflict_cost: Number(f_conflict_cost.toFixed(2)),
          route_requirement: Number(f_route_req.toFixed(2)),
        },
        final_score,
        rank: 0,
      };
    });

    // 3. Sort by final score descending; break ties by severity, then ETA
    evaluatedCandidates.sort((a, b) => {
      if (b.final_score !== a.final_score) return b.final_score - a.final_score;
      if (b.severity_score !== a.severity_score) return b.severity_score - a.severity_score;
      return a.eta_seconds - b.eta_seconds;
    });

    evaluatedCandidates.forEach((c, idx) => {
      c.rank = idx + 1;
    });

    // 4. Greedy Conflict-Aware Scheduling
    // Group mutually non-conflicting movements into the same green phase
    const phases: PrioritySchedulePhase[] = [];
    const remainingCandidates = [...evaluatedCandidates];

    let phaseOrder = 1;
    while (remainingCandidates.length > 0) {
      const leader = remainingCandidates.shift()!;
      const groupMissions = [leader.mission_id];
      const groupMovements = [leader.movement];

      // Check if any subsequent candidates can share green safely
      for (let i = remainingCandidates.length - 1; i >= 0; i--) {
        const candidate = remainingCandidates[i];
        const canGroup = groupMovements.every(
          (m) => !SafetyValidator.areMovementsConflicting(junctionId, m, candidate.movement)
        );

        if (canGroup) {
          groupMissions.push(candidate.mission_id);
          groupMovements.push(candidate.movement);
          remainingCandidates.splice(i, 1);
        }
      }

      // Safe green allocation clamped to [min_green, max_green]
      const greenSec = Math.max(
        config.min_green_seconds,
        Math.min(config.max_green_seconds, 12 + groupMissions.length * 4)
      );

      phases.push({
        phase_order: phaseOrder++,
        mission_ids: groupMissions,
        movements: groupMovements,
        green_seconds: greenSec,
        yellow_seconds: config.yellow_seconds,
        all_red_seconds: config.all_red_seconds,
      });
    }

    const ranking = evaluatedCandidates.map((c) => ({
      mission_id: c.mission_id,
      rank: c.rank,
      final_score: c.final_score,
    }));

    // Deterministic templated rationale
    let rationale = `Priority scheduled for ${evaluatedCandidates.length} vehicle(s). Top priority granted to ${evaluatedCandidates[0].ambulance_call_sign} (Score: ${(evaluatedCandidates[0].final_score * 100).toFixed(0)}%, Severity: ${evaluatedCandidates[0].severity_score}).`;
    if (phases.length > 1) {
      rationale += ` Multiple conflicting movements segregated into ${phases.length} sequential clearance phases.`;
    } else if (evaluatedCandidates.length > 1) {
      rationale += ' Mutually non-conflicting movements granted simultaneous green corridor.';
    }

    const decision: PriorityDecision = {
      id: uuidv4(),
      junction_id: junctionId,
      candidates: evaluatedCandidates,
      ranking,
      schedule: phases,
      safety_validated: true,
      ai_rationale: rationale,
      ai_model: 'deterministic-formula',
      created_at: new Date().toISOString(),
    };

    store.priority_decisions.set(decision.id, decision);
    return decision;
  }

  /**
   * Enhances priority decision with Gemini AI review and contextual operator explanation
   */
  static async evaluateWithAi(
    junctionId: string,
    customCandidates?: any[]
  ): Promise<PriorityDecision> {
    const deterministicDecision = this.evaluateJunction(junctionId, customCandidates);

    if (deterministicDecision.candidates.length === 0) {
      return deterministicDecision;
    }

    try {
      const junction = store.junctions.get(junctionId);
      const conflicts = Array.from(store.junction_conflicts.values()).filter(
        (c) => c.junction_id === junctionId
      );

      const { systemInstruction, userPrompt } = buildPriorityRationalePrompt({
        junction: { junction, conflicts },
        candidates: deterministicDecision.candidates,
        ranking: deterministicDecision.ranking,
        schedule: deterministicDecision.schedule,
      });

      const aiResult = await generateStructured(priorityRationaleSchema, {
        systemInstruction,
        userPrompt,
        temperature: 0.1,
      });

      if (aiResult.data.rationale && !aiResult.data.needs_fallback) {
        deterministicDecision.ai_rationale = aiResult.data.rationale;
        deterministicDecision.ai_model = aiResult.model;
        store.priority_decisions.set(deterministicDecision.id, deterministicDecision);
      }
    } catch (err: any) {
      logger.info({ error: err.message }, 'Using deterministic priority rationale fallback');
    }

    return deterministicDecision;
  }
}
