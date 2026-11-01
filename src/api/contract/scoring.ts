import { SCORE_MAX, SCORE_MIN } from './common';
import type { ScorecardCriterion } from './scorecards';
import type { CriterionScore } from './evaluations';

export type ScoreBand = 'low' | 'mid' | 'high';

/** Weighted mean of criterion scores, rounded to one decimal. Missing criteria are ignored. */
export function computeOverallScore(
  criteria: readonly ScorecardCriterion[],
  scores: readonly CriterionScore[],
): number | null {
  const byId = new Map(scores.map((s) => [s.criterionId, s.score]));
  let weighted = 0;
  let totalWeight = 0;
  for (const c of criteria) {
    const score = byId.get(c.id);
    if (score === undefined) continue;
    weighted += score * c.weight;
    totalWeight += c.weight;
  }
  if (totalWeight === 0) return null;
  const value = weighted / totalWeight;
  return Math.round(Math.min(SCORE_MAX, Math.max(SCORE_MIN, value)) * 10) / 10;
}

/** Bands are presentational defaults; the pass threshold comes from the scorecard. */
export function scoreBand(score: number, passThreshold: number): ScoreBand {
  if (score >= passThreshold) return 'high';
  if (score >= passThreshold - 2) return 'mid';
  return 'low';
}
