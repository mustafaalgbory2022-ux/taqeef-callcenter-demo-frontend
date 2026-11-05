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
/** Non-negative integer point units. */
const units: Decoder<number> = (v, path = '') => {
  const n = num(v, path);
  if (!Number.isInteger(n) || n < 0 || n > 2000) throw new DecodeError(path, 'integer units');
  return n;
};
const pointUnit: Decoder<1 | 2> = (v, path = '') => {
  if (v !== 1 && v !== 2) throw new DecodeError(path, '1 or 2');
  return v;
};
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
  // CONFIRMED (contract v0.1 3.5): run point sums in integer units, with the unit.
  points_awarded_sum: units,
  points_possible_sum: units,
  unit: pointUnit,
  // PROVISIONAL names (not in the contract): scorecard total and minimum, in the same unit.
  possible_points: units,
  minimum_assessable_points: units,
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
      // CONFIRMED (3.2): criterion points in integer units of the run's unit.
      units_awarded: nullable(units),
      units_possible: units,
      // PROVISIONAL: penalty deduction, assumed in the same unit.
      penalty_points: units,
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
    if (assessed === (c.units_awarded === null)) {
      throw new DecodeError(`${at}.units_awarded`, 'units exactly when the criterion is assessed');
    }
    if (assessed === (c.reason_code !== null)) {
      throw new DecodeError(`${at}.reason_code`, 'a reason code exactly when not_assessable');
    }
    if ((c.reason_code === 'ai_declared') !== (c.na_reason !== null)) {
      throw new DecodeError(`${at}.na_reason`, 'a declared reason exactly when ai_declared');
    }
    if (c.units_awarded !== null && c.units_awarded > c.units_possible) {
      throw new DecodeError(`${at}.units_awarded`, 'at most units_possible');
    }
  });
  if (w.points_awarded_sum > w.points_possible_sum) {
    throw new DecodeError('points_awarded_sum', 'at most points_possible_sum');
  }
  const scored = w.outcome === 'scored';
  if (scored && w.points_possible_sum === 0) {
    throw new DecodeError('points_possible_sum', 'assessed points for a scored run');
  }
  // Integrity check only (M2 CHECK display_hundredths = (1000·A)/P): a mismatch is contract
  // drift and is rejected; the displayed value is always the served display_hundredths.
  if (
    scored &&
    w.display_hundredths !== null &&
    w.display_hundredths !== Math.floor((1000 * w.points_awarded_sum) / w.points_possible_sum)
  ) {
    throw new DecodeError(
      'display_hundredths',
      '(1000 × points_awarded_sum) ÷ points_possible_sum',
    );
  }
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
    unit: w.unit,
    awardedUnits: w.points_awarded_sum,
    assessableUnits: w.points_possible_sum,
    possibleUnits: w.possible_points,
    minimumAssessableUnits: w.minimum_assessable_points,
    displayHundredths: w.display_hundredths,
    belowThreshold: w.below_threshold,
    thresholdHundredths: w.threshold_hundredths,
    criteria: w.criteria.map((c) => ({
      criterionId: c.criterion_id,
      result: c.result,
      reasonCode: c.reason_code,
      aiDeclaredReason: c.na_reason,
      unit: w.unit,
      awardedUnits: c.units_awarded,
      possibleUnits: c.units_possible,
      penaltyUnits: c.penalty_points,
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
