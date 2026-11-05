import type { Evaluation, LocalizedText, ScorecardVersion } from '@/shared/types/domain';
import {
  isAssessed,
  exactMeanHundredths,
  toHalfPoints,
  normalizeToTen,
} from '@/shared/utils/score';
import { currentEvaluations, isScored } from '@/features/evaluations/model';

// Re-exported so dashboard consumers have one model entry point.
export { currentEvaluations, isScored } from '@/features/evaluations/model';

export function versionLookup(versions: readonly ScorecardVersion[]) {
  const map = new Map(versions.map((v) => [`${v.scorecardId}@${v.version}`, v]));
  return (e: Pick<Evaluation, 'scorecardId' | 'scorecardVersion'>) =>
    map.get(`${e.scorecardId}@${e.scorecardVersion}`);
}

export interface CriterionSummary {
  criterionId: string;
  label: LocalizedText;
  /** Actual points awarded / possible, pooled over scored evaluations where it was scored. */
  /** Pooled criterion points in HALF-POINTS (common basis across point units). */
  awardedHalfPoints: number;
  possibleHalfPoints: number;
  /**
   * PROVISIONAL VISUALIZATION computed in the browser: pooled awarded ÷ possible on a 0–10
   * scale (labelled "normalized"). Not a backend score and never compared with a threshold.
   */
  normalized: number | null;
  scoredCount: number;
  notAssessableCount: number;
  insufficientCount: number;
}

export interface PerformanceSummary {
  /** Calls whose current evaluation produced a score (the sample size n). */
  scoredCalls: number;
  /** Calls whose current evaluation is "Insufficient evidence — no score". */
  insufficientCalls: number;
  /** Pooled per call: Σ call scores / scored calls. Never a mean of agent averages. */
  /** Average quality score in hundredths (exact mean, truncated); null without scored calls. */
  averageHundredths: number | null;
  /** Scored runs the backend flagged `below_threshold` (each with its own threshold). */
  lowScoreCalls: number;
  /**
   * The runs' own `threshold_hundredths` when every scored run reports the same one; null when
   * they differ or a run does not report it. Never the current scorecard's threshold.
   */
  runThresholdHundredths: number | null;
  scorecardVersions: number[];
  criteria: CriterionSummary[];
}

/**
 * Summarise the CURRENT evaluation of each call. Insufficient-evidence evaluations are
 * counted separately and excluded from every scored figure (averages, low-score counts,
 * criterion points).
 */
export function summarize(
  current: readonly Evaluation[],
  versions: readonly ScorecardVersion[],
): PerformanceSummary {
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  const scored = current.filter(isScored);

  // Criteria ordered as in the newest version, then any retired criteria still in data.
  const labels = new Map<string, LocalizedText>();
  for (const v of sorted)
    for (const c of v.criteria) if (!labels.has(c.id)) labels.set(c.id, c.label);

  const criteria: CriterionSummary[] = [...labels.entries()].map(([criterionId, label]) => {
    const row: CriterionSummary = {
      criterionId,
      label,
      awardedHalfPoints: 0,
      possibleHalfPoints: 0,
      normalized: null,
      scoredCount: 0,
      notAssessableCount: 0,
      insufficientCount: 0,
    };
    for (const e of scored) {
      const r = e.criteria.find((c) => c.criterionId === criterionId);
      if (!r) continue;
      if (isAssessed(r)) {
        // Summed in half-points so runs with different units add up correctly.
        row.awardedHalfPoints += toHalfPoints(r.awardedUnits, r.unit);
        row.possibleHalfPoints += toHalfPoints(r.possibleUnits, r.unit);
        row.scoredCount += 1;
      } else if (r.aiDeclaredReason === 'insufficient_evidence') row.insufficientCount += 1;
      else row.notAssessableCount += 1;
    }
    row.normalized = normalizeToTen(row.awardedHalfPoints, row.possibleHalfPoints);
    return row;
  });

  return {
    scoredCalls: scored.length,
    insufficientCalls: current.length - scored.length,
    // Exact mean of the runs' ratios (interface v1 §8), from the backend's run-level points,
    // truncated to hundredths. Never an average of displayed (truncated) scores.
    averageHundredths: exactMeanHundredths(
      scored.map((e) => ({ awarded: e.awardedUnits, assessable: e.assessableUnits })),
    ),
    // The backend's below_threshold per run (contract v0.1 3.7); never recomputed here.
    lowScoreCalls: scored.filter((e) => e.belowThreshold === true).length,
    runThresholdHundredths: sharedRunThreshold(scored),
    scorecardVersions: [...new Set(current.map((e) => e.scorecardVersion))].sort((a, b) => a - b),
    criteria: criteria.filter(
      (c) => c.scoredCount + c.notAssessableCount + c.insufficientCount > 0,
    ),
  };
}

/** The single threshold all scored runs report, else null (differs or not reported). */
function sharedRunThreshold(scored: readonly Evaluation[]): number | null {
  const values = new Set(scored.map((e) => e.thresholdHundredths));
  if (values.size !== 1) return null;
  const [only] = [...values];
  return only ?? null;
}

/**
 * The runs dashboards and averages use: exactly ONE run per call (re-evaluations never count
 * twice). Contract v0.1 4.6 (CONFIRMED) defines the population as "per call, the latest Scored
 * run on the Active scorecard version". Applied here as far as the contract allows:
 * - restricted to the selected scorecard version FIRST, then the latest run per call (so a
 *   newer run on another version never hides this version's run);
 * - OPEN: the Active version is not reported by the API yet, so "All versions" (no filter)
 *   takes each call's latest run of any version and is labelled as mixed;
 * - OPEN: whether "latest Scored run" falls back to an older scored run when the newest run
 *   has no score is ambiguous. The existing rule is kept: the latest run is used, and an
 *   unscored latest run is counted as unscored (never replaced by an older score).
 */
export function dashboardPopulation(
  evaluations: readonly Evaluation[],
  version: number | null,
): Evaluation[] {
  return currentEvaluations(filterByVersion(evaluations, version));
}

/** Keep only evaluations made with one scorecard version (null = all versions). */
export function filterByVersion(
  current: readonly Evaluation[],
  version: number | null,
): Evaluation[] {
  return version === null ? [...current] : current.filter((e) => e.scorecardVersion === version);
}
