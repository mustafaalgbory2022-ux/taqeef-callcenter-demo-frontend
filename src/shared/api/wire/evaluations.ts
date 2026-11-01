import type { Evaluation } from '@/shared/types/domain';
import {
  arrayOf,
  bool,
  DecodeError,
  nullable,
  num,
  numInRange,
  object,
  oneOf,
  str,
  type Decoded,
} from '../decode';
import { wireTimeToMs } from './common';

const score = numInRange(0, 10);
const points = numInRange(0, 1000);
const wireEvidence = object({ segment_id: str, start_ms: num, end_ms: num, quote: str });

export const wireEvaluation = object({
  id: str,
  call_id: str,
  call_recorded_at: str,
  agent_id: nullable(str),
  scorecard_id: str,
  scorecard_version: num,
  status: oneOf(['completed', 'failed']),
  outcome: nullable(oneOf(['scored', 'insufficient_evidence'])),
  awarded_points: points,
  assessable_points: points,
  possible_points: points,
  minimum_assessable_points: points,
  overall_score: nullable(score),
  criteria: arrayOf(
    object({
      criterion_id: str,
      result: oneOf(['scored', 'not_assessable', 'insufficient_evidence']),
      awarded_points: nullable(points),
      possible_points: points,
      penalty_points: points,
      rationale: str,
      evidence: arrayOf(wireEvidence),
    }),
  ),
  prohibited_hits: arrayOf(
    object({
      expression_id: str,
      phrase: str,
      segment_id: str,
      start_ms: num,
      quote: str,
      speaker: oneOf(['agent', 'customer', 'unresolved']),
      disposition: oneOf(['penalty_applied', 'flagged_for_review']),
      penalty_points: points,
    }),
  ),
  trigger: oneOf(['initial', 'rescore']),
  supersedes_id: nullable(str),
  created_at: str,
  simulated: bool,
});

export type WireEvaluation = Decoded<typeof wireEvaluation>;

/** Internal consistency checks beyond field types (fail loudly on contract drift). */
function assertConsistent(w: WireEvaluation): void {
  w.criteria.forEach((c, i) => {
    if (c.result === 'scored' && c.awarded_points === null) {
      throw new DecodeError(`criteria[${i}].awarded_points`, 'points when result is "scored"');
    }
    if (c.awarded_points !== null && c.awarded_points > c.possible_points) {
      throw new DecodeError(`criteria[${i}].awarded_points`, 'at most possible_points');
    }
  });
  if (w.status === 'completed' && w.outcome === null) {
    throw new DecodeError('outcome', 'an outcome for a completed evaluation');
  }
  if ((w.outcome === 'scored') !== (w.overall_score !== null)) {
    throw new DecodeError('overall_score', 'a score exactly when outcome is "scored"');
  }
}

export function evaluationFromWire(w: WireEvaluation): Evaluation {
  assertConsistent(w);
  return {
    id: w.id,
    callId: w.call_id,
    callRecordedAt: w.call_recorded_at,
    agentId: w.agent_id,
    scorecardId: w.scorecard_id,
    scorecardVersion: w.scorecard_version,
    status: w.status,
    outcome: w.outcome,
    awardedPoints: w.awarded_points,
    assessablePoints: w.assessable_points,
    possiblePoints: w.possible_points,
    minimumAssessablePoints: w.minimum_assessable_points,
    overallScore: w.overall_score,
    criteria: w.criteria.map((c) => ({
      criterionId: c.criterion_id,
      result: c.result,
      awardedPoints: c.result === 'scored' ? c.awarded_points : null,
      possiblePoints: c.possible_points,
      penaltyPoints: c.penalty_points,
      rationale: c.rationale,
      evidence: c.evidence.map((e) => ({
        segmentId: e.segment_id,
        startMs: wireTimeToMs(e.start_ms),
        endMs: wireTimeToMs(e.end_ms),
        quote: e.quote,
      })),
    })),
    prohibitedHits: w.prohibited_hits.map((h) => ({
      expressionId: h.expression_id,
      phrase: h.phrase,
      segmentId: h.segment_id,
      startMs: wireTimeToMs(h.start_ms),
      quote: h.quote,
      speaker: h.speaker,
      disposition: h.disposition,
      penaltyPoints: h.penalty_points,
    })),
    trigger: w.trigger,
    supersedesId: w.supersedes_id,
    createdAt: w.created_at,
    simulated: w.simulated,
  };
}
