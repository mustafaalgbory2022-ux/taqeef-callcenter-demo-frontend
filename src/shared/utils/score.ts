import type { Criterion, CriterionEvaluation } from '@/shared/types/domain';

export const SCORE_MIN = 0;
export const SCORE_MAX = 10;
export const DEFAULT_LOW_SCORE_THRESHOLD = 7;

/**
 * Truncate to two decimals, always rounding down (approved display rule).
 * A tiny epsilon absorbs binary floating-point error (e.g. 6.9999999999 that is really 7).
 */
export function floorTo2(value: number): number {
  return Math.floor(value * 100 + 1e-9) / 100;
}

/**
 * Low score = strictly below the threshold (default 7.00), on the unrounded value. The
 * epsilon stops floating-point noise (a true 7 computed as 6.999999999999999) being "low".
 */
export function isLowScore(
  score: number,
  threshold: number = DEFAULT_LOW_SCORE_THRESHOLD,
): boolean {
  return score < threshold - 1e-9;
}

export function isWholePointScore(value: number): boolean {
  return Number.isInteger(value) && value >= SCORE_MIN && value <= SCORE_MAX;
}

/**
 * Reference implementation of the overall score: weighted mean of criteria that were
 * scored. "Not assessable" and "insufficient evidence" are excluded from the denominator.
 * Returns null when nothing could be scored. The real backend is authoritative; this is
 * used by the simulated backend and tests.
 */
export function computeOverallScore(
  criteria: readonly Criterion[],
  results: readonly CriterionEvaluation[],
): number | null {
  const byId = new Map(results.map((r) => [r.criterionId, r]));
  let weighted = 0;
  let totalWeight = 0;
  for (const criterion of criteria) {
    const result = byId.get(criterion.id);
    if (result?.result !== 'scored' || result.score === null) continue;
    weighted += result.score * criterion.weight;
    totalWeight += criterion.weight;
  }
  return totalWeight === 0 ? null : weighted / totalWeight;
}
