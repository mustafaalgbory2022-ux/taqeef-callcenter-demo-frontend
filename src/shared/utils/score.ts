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

/** Largest `display_hundredths` value (10.00 / 10). */
export const HUNDREDTHS_MAX = 1000;

/** True for a valid `display_hundredths` value: an integer 0–1000 (contract v0.1 3.4). */
export function isDisplayHundredths(d: number): boolean {
  return Number.isInteger(d) && d >= 0 && d <= HUNDREDTHS_MAX;
}

/**
 * Split `display_hundredths` into whole and two-digit parts with integer arithmetic only:
 * `${floor(d/100)}.${pad2(d%100)}` (contract v0.1 3.4). 699 → ["6", "99"]. No rounding.
 */
export function hundredthsParts(d: number): { whole: number; fraction: string } {
  if (!isDisplayHundredths(d)) throw new RangeError(`Invalid display_hundredths: ${d}`);
  return { whole: Math.floor(d / 100), fraction: String(d % 100).padStart(2, '0') };
}

/**
 * Average quality score as the EXACT mean of the runs' ratios A/P (interface v1 §8: "exact
 * mean of ratios"), truncated to hundredths of the 0–10 scale: floor(1000 · Σ(Aᵢ/Pᵢ) / n).
 * Exact rational arithmetic (BigInt), never floats and never an average of truncated values.
 * A and P are each run's awarded and assessable points as served by the backend.
 */
export function exactMeanHundredths(
  runs: readonly { awarded: number; assessable: number }[],
): number | null {
  const valid = runs.filter((r) => r.assessable > 0);
  if (valid.length === 0) return null;
  for (const r of valid) {
    if (!Number.isInteger(r.awarded) || !Number.isInteger(r.assessable)) {
      throw new RangeError('Points must be whole numbers');
    }
  }
  // Σ Aᵢ/Pᵢ = num / den, kept exact.
  let num = 0n;
  let den = 1n;
  for (const r of valid) {
    const a = BigInt(r.awarded);
    const p = BigInt(r.assessable);
    num = num * p + a * den;
    den = den * p;
  }
  const result = (1000n * num) / (den * BigInt(valid.length)); // BigInt division truncates
  return Number(result);
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

/**
 * Integer units expressed as half-points, a common basis for comparing or summing values that
 * may come in different units (unit 1: 1 unit = 2 half-points; unit 2: 1 unit = 1 half-point).
 */
export function toHalfPoints(units: number, unit: 1 | 2): number {
  return unit === 1 ? units * 2 : units;
}

/** A criterion counts as assessed (in the denominator) unless it is not assessable. */
export function isAssessed(
  r: Pick<CriterionEvaluation, 'result' | 'awardedUnits'>,
): r is Pick<CriterionEvaluation, 'result'> & { awardedUnits: number } {
  return r.result !== 'not_assessable' && r.awardedUnits !== null;
}

export interface EvaluationScore {
  awardedUnits: number;
  assessableUnits: number;
  possibleUnits: number;
  outcome: 'scored' | 'insufficient_evidence' | 'not_assessable';
  /** awarded / assessable × 10, or null when below the minimum assessable points. */
  overallScore: number | null;
}

/**
 * SIMULATED backend reference scoring for the mock (whole points, unit 1). The real backend is
 * authoritative; the UI never uses this to display scores.
 * Deterministic reference scoring from actual points:
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
  let awardedUnits = 0;
  let assessableUnits = 0;
  let possibleUnits = 0;
  for (const criterion of criteria) {
    possibleUnits += criterion.maxPoints;
    const r = byId.get(criterion.id);
    if (!r || !isAssessed(r)) continue;
    assessableUnits += criterion.maxPoints;
    awardedUnits += Math.min(criterion.maxPoints, Math.max(0, r.awardedUnits));
  }
  const sufficient = assessableUnits > 0 && assessableUnits >= minimumAssessablePoints;
  return {
    awardedUnits,
    assessableUnits,
    possibleUnits,
    // Reference rule used by the SIMULATED backend only; the real outcome comes from the API.
    outcome: sufficient
      ? 'scored'
      : assessableUnits === 0
        ? 'not_assessable'
        : 'insufficient_evidence',
    overallScore: sufficient ? normalizeToTen(awardedUnits, assessableUnits) : null,
  };
}
