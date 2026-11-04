import type { Evaluation } from '@/shared/types/domain';

/**
 * How an evaluation's result is presented (confirmed display rules, interface handoff §7):
 * - scored: "x.xx / 10";
 * - insufficient_evidence: some, but fewer than the minimum, assessable points → "Insufficient
 *   evidence — No score";
 * - not_assessable: no assessable points at all (e.g. speaker roles unknown) → "Not assessable —
 *   No score";
 * - failed: processing failed, no result.
 * Derived only from existing fields. The demo contract has no separate not-assessable outcome
 * yet, so `insufficient_evidence` with zero assessable points is presented as not assessable.
 * No score is ever assigned or estimated.
 */
export type ResultPresentation = 'scored' | 'insufficient_evidence' | 'not_assessable' | 'failed';

export function resultPresentation(
  e: Pick<Evaluation, 'status' | 'outcome' | 'overallScore' | 'assessablePoints'>,
): ResultPresentation {
  if (e.status === 'failed') return 'failed';
  if (e.outcome === 'scored' && e.overallScore !== null) return 'scored';
  return e.assessablePoints === 0 ? 'not_assessable' : 'insufficient_evidence';
}
