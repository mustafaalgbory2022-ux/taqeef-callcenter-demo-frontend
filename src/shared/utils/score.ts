import type { Criterion, CriterionEvaluation } from '@/shared/types/domain';

export const SCORE_MIN = 0;
export const SCORE_MAX = 10;
export const DEFAULT_LOW_SCORE_THRESHOLD = 7;
export const DEFAULT_MINIMUM_ASSESSABLE_POINTS = 6;

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

/** Points expressed on the 0–10 display scale. Null when nothing was possible. */
export function normalizeToTen(awarded: number, possible: number): number | null {
  return possible > 0 ? (awarded / possible) * SCORE_MAX : null;
}

/** Valid awarded points for a criterion: whole points; all-or-nothing without partial credit. */
export function isValidAward(
  points: number,
  criterion: Pick<Criterion, 'maxPoints' | 'allowPartialCredit'>,
): boolean {
  if (!Number.isInteger(points) || points < 0 || points > criterion.maxPoints) return false;
  return criterion.allowPartialCredit || points === 0 || points === criterion.maxPoints;
}

export interface EvaluationScore {
  awardedPoints: number;
  assessablePoints: number;
  possiblePoints: number;
  outcome: 'scored' | 'insufficient_evidence';
  /** awarded / assessable × 10, or null when below the minimum assessable points. */
  overallScore: number | null;
}

/**
 * Deterministic reference scoring from actual points (the backend is authoritative):
 * - only criteria with result "scored" are assessable (count in the denominator);
 * - if assessable points < the scorecard minimum (approved: 6 of 10), the whole evaluation
 *   is "Insufficient evidence — no score";
 * - otherwise overall = awarded points / assessable points × 10.
 */
export function scoreEvaluation(
  criteria: readonly Criterion[],
  results: readonly CriterionEvaluation[],
  minimumAssessablePoints: number,
): EvaluationScore {
  const byId = new Map(results.map((r) => [r.criterionId, r]));
  let awardedPoints = 0;
  let assessablePoints = 0;
  let possiblePoints = 0;
  for (const criterion of criteria) {
    possiblePoints += criterion.maxPoints;
    const r = byId.get(criterion.id);
    if (r?.result !== 'scored' || r.awardedPoints === null) continue;
    assessablePoints += criterion.maxPoints;
    awardedPoints += Math.min(criterion.maxPoints, Math.max(0, r.awardedPoints));
  }
  const sufficient = assessablePoints > 0 && assessablePoints >= minimumAssessablePoints;
  return {
    awardedPoints,
    assessablePoints,
    possiblePoints,
    outcome: sufficient ? 'scored' : 'insufficient_evidence',
    overallScore: sufficient ? normalizeToTen(awardedPoints, assessablePoints) : null,
  };
}
