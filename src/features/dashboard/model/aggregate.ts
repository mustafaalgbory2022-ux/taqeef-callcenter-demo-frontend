import type { Agent, Evaluation, LocalizedText, ScorecardVersion } from '@/shared/types/domain';
import { DEFAULT_LOW_SCORE_THRESHOLD, isLowScore } from '@/shared/utils/score';

// Re-exported so dashboard consumers have one model entry point.
export { currentEvaluations, isEligible } from '@/features/evaluations/model';

export function versionLookup(versions: readonly ScorecardVersion[]) {
  const map = new Map(versions.map((v) => [`${v.scorecardId}@${v.version}`, v]));
  return (e: Pick<Evaluation, 'scorecardId' | 'scorecardVersion'>) =>
    map.get(`${e.scorecardId}@${e.scorecardVersion}`);
}

export interface CriterionSummary {
  criterionId: string;
  label: LocalizedText;
  /** Pooled mean over evaluated calls where this criterion was scored. */
  average: number | null;
  scoredCount: number;
  notAssessableCount: number;
  insufficientCount: number;
}

export interface PerformanceSummary {
  evaluatedCalls: number;
  /** Pooled: Σ call scores / number of evaluated calls. */
  averageScore: number | null;
  /** Calls strictly below the threshold of the scorecard version that evaluated them. */
  lowScoreCalls: number;
  /** Threshold used for meters/labels: the selected version's, else the newest version's. */
  threshold: number;
  /** Version that `threshold` comes from. */
  thresholdVersion: number | null;
  /** True when the counted evaluations used versions with different thresholds. */
  mixedThresholds: boolean;
  scorecardVersions: number[];
  criteria: CriterionSummary[];
}

export function summarize(
  current: readonly Evaluation[],
  versions: readonly ScorecardVersion[],
  selectedVersion: number | null = null,
): PerformanceSummary {
  const versionOf = versionLookup(versions);
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  const reference =
    (selectedVersion !== null && sorted.find((v) => v.version === selectedVersion)) || sorted[0];
  const threshold = reference?.lowScoreThreshold ?? DEFAULT_LOW_SCORE_THRESHOLD;
  const usedThresholds = new Set(
    current.map((e) => versionOf(e)?.lowScoreThreshold ?? DEFAULT_LOW_SCORE_THRESHOLD),
  );

  const scores = current.map((e) => e.overallScore ?? 0);
  const lowScoreCalls = current.filter((e) =>
    isLowScore(e.overallScore ?? 0, versionOf(e)?.lowScoreThreshold ?? DEFAULT_LOW_SCORE_THRESHOLD),
  ).length;

  // Criteria ordered as in the newest version, then any retired criteria still in data.
  const order = new Map<string, LocalizedText>();
  for (const v of [...versions].sort((a, b) => b.version - a.version)) {
    for (const c of v.criteria) if (!order.has(c.id)) order.set(c.id, c.label);
  }

  const criteria: CriterionSummary[] = [...order.entries()].map(([criterionId, label]) => {
    let sum = 0;
    let scoredCount = 0;
    let notAssessableCount = 0;
    let insufficientCount = 0;
    for (const e of current) {
      const r = e.criteria.find((c) => c.criterionId === criterionId);
      if (!r) continue;
      if (r.result === 'scored' && r.score !== null) {
        sum += r.score;
        scoredCount += 1;
      } else if (r.result === 'not_assessable') notAssessableCount += 1;
      else insufficientCount += 1;
    }
    return {
      criterionId,
      label,
      average: scoredCount ? sum / scoredCount : null,
      scoredCount,
      notAssessableCount,
      insufficientCount,
    };
  });

  return {
    evaluatedCalls: current.length,
    averageScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    lowScoreCalls,
    threshold,
    thresholdVersion: reference?.version ?? null,
    mixedThresholds: usedThresholds.size > 1,
    scorecardVersions: [...new Set(current.map((e) => e.scorecardVersion))].sort((a, b) => a - b),
    criteria: criteria.filter(
      (c) => c.scoredCount + c.notAssessableCount + c.insufficientCount > 0 || current.length === 0,
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

export interface AgentSummary {
  agent: Agent;
  summary: PerformanceSummary;
}

/** Per-agent summaries, alphabetical (no ranking by score). */
export function summarizeByAgent(
  current: readonly Evaluation[],
  agents: readonly Agent[],
  versions: readonly ScorecardVersion[],
  selectedVersion: number | null = null,
): AgentSummary[] {
  return [...agents]
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map((agent) => ({
      agent,
      summary: summarize(
        current.filter((e) => e.agentId === agent.id),
        versions,
        selectedVersion,
      ),
    }));
}
