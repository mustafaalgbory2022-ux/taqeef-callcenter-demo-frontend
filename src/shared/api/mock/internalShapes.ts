/**
 * MOCK-ONLY internal storage shapes for evaluation runs and transcripts. The simulated
 * backend keeps its data in these shapes and serializes them to the contract v0.3 wire format
 * at its routes (see ./serialize.ts). Nothing outside the mock imports this file.
 */
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
import { utcTimestamp } from '../wire/common';
import { revisionId, segmentId } from '../wire/ids';

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
const wireEvidence = object({
  transcript_revision_id: revisionId,
  segment_id: segmentId,
  start_ms: num,
  end_ms: num,
  excerpt: str,
  excerpt_truncated: bool,
  counted: bool,
});

const REASON_CODES = [
  'roles_unreliable',
  'no_transcript',
  'too_long',
  'no_evidence',
  'low_confidence_evidence',
  'ai_declared',
] as const;

export const mockRunShape = object({
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
      // Contract v0.3 §7.4: masked by the server, ≤ 600 characters (truncation flag PROPOSED).
      explanation: str,
      explanation_truncated: bool,
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

export const mockTranscriptShape = object({
  call_id: str,
  transcript_revision_id: revisionId,
  revision_no: num,
  segments: arrayOf(
    object({
      segment_id: segmentId,
      start_ms: num,
      end_ms: num,
      speaker: oneOf(['agent', 'customer', 'unknown']),
      language: oneOf(['ar', 'en']),
      text: str,
    }),
  ),
});

export type MockRun = Decoded<typeof mockRunShape>;
export type MockTranscript = Decoded<typeof mockTranscriptShape>;
