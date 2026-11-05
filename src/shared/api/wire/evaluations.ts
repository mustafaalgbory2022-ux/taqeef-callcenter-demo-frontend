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
  type Decoder,
} from '../decode';
import { isDisplayHundredths } from '@/shared/utils/score';
import { utcTimestamp } from './common';
import { revisionId, segmentId } from './ids';

const points = numInRange(0, 1000);
/** Integer 0–1000 (contract v0.1 3.4). */
const hundredths: Decoder<number> = (v, path = '') => {
  const n = num(v, path);
  if (!isDisplayHundredths(n)) throw new DecodeError(path, 'an integer 0–1000');
  return n;
};
/**
 * Evidence is a segment reference only (v0.2 change list item 6). Times and text are taken
 * from the run's transcript revision. The optional word span is not decoded until its field
 * names are confirmed.
 */
const wireEvidence = object({ segment_id: segmentId });

const REASON_CODES = [
  'roles_unreliable',
  'no_transcript',
  'too_long',
  'no_evidence',
  'low_confidence_evidence',
  'ai_declared',
] as const;

export const wireEvaluation = object({
  id: str,
  call_id: str,
  agent_id: nullable(str),
  scorecard_id: str,
  scorecard_version: num,
  transcript_revision_id: revisionId,
  outcome: oneOf(['scored', 'insufficient_evidence', 'not_assessable']),
  awarded_points: points,
  assessable_points: points,
  possible_points: points,
  minimum_assessable_points: points,
  // CONFIRMED (contract v0.1 3.4, 3.7): the displayed score and low-score flag come from the
  // backend. `overall_score` (a float) is no longer read.
  display_hundredths: nullable(hundredths),
  below_threshold: nullable(bool),
  threshold_hundredths: nullable(hundredths),
  criteria: arrayOf(
    object({
      criterion_id: str,
      result: oneOf(['met', 'partially_met', 'not_met', 'not_assessable']),
      reason_code: nullable(oneOf(REASON_CODES)),
      na_reason: nullable(oneOf(['insufficient_evidence', 'not_applicable'])),
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
      segment_id: segmentId,
      speaker: oneOf(['agent', 'customer', 'unknown']),
      disposition: oneOf(['penalty_applied', 'flagged_for_review']),
      penalty_points: points,
    }),
  ),
  trigger: oneOf(['initial', 'rescore']),
  supersedes_id: nullable(str),
  created_at: utcTimestamp,
  simulated: bool,
});

export type WireEvaluation = Decoded<typeof wireEvaluation>;

/** Internal consistency checks beyond field types (fail loudly on contract drift). */
function assertConsistent(w: WireEvaluation): void {
  w.criteria.forEach((c, i) => {
    const at = `criteria[${i}]`;
    const assessed = c.result !== 'not_assessable';
    if (assessed === (c.awarded_points === null)) {
      throw new DecodeError(
        `${at}.awarded_points`,
        'points exactly when the criterion is assessed',
      );
    }
    if (assessed === (c.reason_code !== null)) {
      throw new DecodeError(`${at}.reason_code`, 'a reason code exactly when not_assessable');
    }
    if ((c.reason_code === 'ai_declared') !== (c.na_reason !== null)) {
      throw new DecodeError(`${at}.na_reason`, 'a declared reason exactly when ai_declared');
    }
    if (c.awarded_points !== null && c.awarded_points > c.possible_points) {
      throw new DecodeError(`criteria[${i}].awarded_points`, 'at most possible_points');
    }
  });
  const scored = w.outcome === 'scored';
  if (scored !== (w.display_hundredths !== null)) {
    throw new DecodeError('display_hundredths', 'a value exactly when outcome is "scored"');
  }
  if (scored !== (w.below_threshold !== null)) {
    throw new DecodeError('below_threshold', 'a value exactly when outcome is "scored"');
  }
}

export function evaluationFromWire(w: WireEvaluation): Evaluation {
  assertConsistent(w);
  return {
    id: w.id,
    callId: w.call_id,
    agentId: w.agent_id,
    scorecardId: w.scorecard_id,
    scorecardVersion: w.scorecard_version,
    transcriptRevisionId: w.transcript_revision_id,
    outcome: w.outcome,
    awardedPoints: w.awarded_points,
    assessablePoints: w.assessable_points,
    possiblePoints: w.possible_points,
    minimumAssessablePoints: w.minimum_assessable_points,
    displayHundredths: w.display_hundredths,
    belowThreshold: w.below_threshold,
    thresholdHundredths: w.threshold_hundredths,
    criteria: w.criteria.map((c) => ({
      criterionId: c.criterion_id,
      result: c.result,
      reasonCode: c.reason_code,
      aiDeclaredReason: c.na_reason,
      awardedPoints: c.awarded_points,
      possiblePoints: c.possible_points,
      penaltyPoints: c.penalty_points,
      rationale: c.rationale,
      evidence: c.evidence.map((e) => ({ segmentId: e.segment_id })),
    })),
    prohibitedHits: w.prohibited_hits.map((h) => ({
      expressionId: h.expression_id,
      phrase: h.phrase,
      segmentId: h.segment_id,
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
