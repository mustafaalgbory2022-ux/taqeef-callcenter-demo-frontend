import type {
  CriterionEvaluation,
  Evaluation,
  LocalizedText,
  ScorecardVersion,
} from '@/shared/types/domain';

export interface CriterionComparison {
  criterionId: string;
  label: LocalizedText;
  before: CriterionEvaluation | null;
  after: CriterionEvaluation | null;
  /** Change in ACTUAL awarded points when both sides were scored, otherwise null. */
  pointsDelta: number | null;
}

export interface EvaluationComparison {
  overallDelta: number | null;
  criteria: CriterionComparison[];
  hitsBefore: number;
  hitsAfter: number;
  versionChanged: boolean;
}

/** Compare two evaluations of the same call criterion by criterion (matched by id). */
export function compareEvaluations(
  before: Evaluation,
  after: Evaluation,
  versions: readonly ScorecardVersion[],
): EvaluationComparison {
  const labels = new Map<string, LocalizedText>();
  for (const v of [...versions].sort((a, b) => b.version - a.version)) {
    for (const c of v.criteria) if (!labels.has(c.id)) labels.set(c.id, c.label);
  }
  const ids = [...new Set([...after.criteria, ...before.criteria].map((c) => c.criterionId))];
  const criteria = ids.map((criterionId) => {
    const b = before.criteria.find((c) => c.criterionId === criterionId) ?? null;
    const a = after.criteria.find((c) => c.criterionId === criterionId) ?? null;
    // Points are only comparable when the criterion's maximum did not change.
    const sameScale = b !== null && a !== null && b.possiblePoints === a.possiblePoints;
    const pointsDelta =
      sameScale && b.awardedPoints != null && a.awardedPoints != null
        ? a.awardedPoints - b.awardedPoints
        : null;
    return {
      criterionId,
      label: labels.get(criterionId) ?? { en: criterionId, ar: criterionId },
      before: b,
      after: a,
      pointsDelta,
    };
  });
  return {
    overallDelta:
      before.overallScore !== null && after.overallScore !== null
        ? after.overallScore - before.overallScore
        : null,
    criteria,
    hitsBefore: before.prohibitedHits.length,
    hitsAfter: after.prohibitedHits.length,
    versionChanged: before.scorecardVersion !== after.scorecardVersion,
  };
}
