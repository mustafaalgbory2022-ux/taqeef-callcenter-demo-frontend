import type { Evaluation } from '@/shared/types/domain';

/**
 * How an evaluation run's result is presented. The outcome is the backend's explicit value
 * (demo API contract 3.1): it is never inferred from points.
 * - scored: "x.xx / 10";
 * - insufficient_evidence: "Insufficient evidence — No score";
 * - not_assessable: "Not assessable — No score".
 * A failed evaluation creates no run; failures are shown from the call status. No score is
 * ever assigned or estimated for an unscored run.
 */
export type ResultPresentation = 'scored' | 'insufficient_evidence' | 'not_assessable';

export function resultPresentation(
  e: Pick<Evaluation, 'outcome' | 'overallScore'>,
): ResultPresentation {
  if (e.outcome === 'scored') return e.overallScore !== null ? 'scored' : 'insufficient_evidence';
  return e.outcome;
}
