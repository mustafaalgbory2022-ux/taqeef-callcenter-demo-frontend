import type { Evaluation, LocalizedText, ScorecardVersion } from '@/shared/types/domain';
import {
  DEFAULT_LOW_SCORE_THRESHOLD,
  isAssessed,
  isLowScore,
  normalizeToTen,
} from '@/shared/utils/score';
import { isScored } from '@/features/evaluations/model';

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
  awardedPoints: number;
  possiblePoints: number;
  /** awardedPoints / possiblePoints on the 0–10 display scale (normalized, not awarded). */
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
  averageScore: number | null;
  /** Scored calls strictly below the threshold of the version that evaluated them. */
  lowScoreCalls: number;
  /** Threshold used for meters/labels: the selected version's, else the newest version's. */
  threshold: number;
  thresholdVersion: number | null;
  /** True when the scored evaluations used versions with different thresholds. */
  mixedThresholds: boolean;
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
  selectedVersion: number | null = null,
): PerformanceSummary {
  const versionOf = versionLookup(versions);
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  const reference =
    (selectedVersion !== null && sorted.find((v) => v.version === selectedVersion)) || sorted[0];
  const scored = current.filter(isScored);
  const thresholdOf = (e: Evaluation) =>
    versionOf(e)?.lowScoreThreshold ?? DEFAULT_LOW_SCORE_THRESHOLD;

  // Criteria ordered as in the newest version, then any retired criteria still in data.
  const labels = new Map<string, LocalizedText>();
  for (const v of sorted)
    for (const c of v.criteria) if (!labels.has(c.id)) labels.set(c.id, c.label);

  const criteria: CriterionSummary[] = [...labels.entries()].map(([criterionId, label]) => {
    const row: CriterionSummary = {
      criterionId,
      label,
      awardedPoints: 0,
      possiblePoints: 0,
      normalized: null,
      scoredCount: 0,
      notAssessableCount: 0,
      insufficientCount: 0,
    };
    for (const e of scored) {
      const r = e.criteria.find((c) => c.criterionId === criterionId);
      if (!r) continue;
      if (isAssessed(r)) {
        row.awardedPoints += r.awardedPoints;
        row.possiblePoints += r.possiblePoints;
        row.scoredCount += 1;
      } else if (r.aiDeclaredReason === 'insufficient_evidence') row.insufficientCount += 1;
      else row.notAssessableCount += 1;
    }
    row.normalized = normalizeToTen(row.awardedPoints, row.possiblePoints);
    return row;
  });

  const scores = scored.map((e) => e.overallScore ?? 0);
  return {
    scoredCalls: scored.length,
    insufficientCalls: current.length - scored.length,
    averageScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    lowScoreCalls: scored.filter((e) => isLowScore(e.overallScore ?? 0, thresholdOf(e))).length,
    threshold: reference?.lowScoreThreshold ?? DEFAULT_LOW_SCORE_THRESHOLD,
    thresholdVersion: reference?.version ?? null,
    mixedThresholds: new Set(scored.map(thresholdOf)).size > 1,
    scorecardVersions: [...new Set(current.map((e) => e.scorecardVersion))].sort((a, b) => a - b),
    criteria: criteria.filter(
      (c) => c.scoredCount + c.notAssessableCount + c.insufficientCount > 0,
    ),
  };
}

/** Keep only evaluations made with one scorecard version (null = all versions). */
export function filterByVersion(
  current: readonly Evaluation[],
  version: number | null,
): Evaluation[] {
  return version === null ? [...current] : current.filter((e) => e.scorecardVersion === version);
}
