import { toHalfPoints } from '@/shared/utils/score';
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
    // Compared in half-points (runs may use different units). Points are only comparable when
    // the criterion's maximum did not change.
    const half = (u: number | null, c: { unit: 1 | 2 }) =>
      u === null ? null : toHalfPoints(u, c.unit);
    const sameScale =
      b !== null && a !== null && half(b.possibleUnits, b) === half(a.possibleUnits, a);
    const bAwarded = b ? half(b.awardedUnits, b) : null;
    const aAwarded = a ? half(a.awardedUnits, a) : null;
    const pointsDelta =
      sameScale && bAwarded !== null && aAwarded !== null ? aAwarded - bAwarded : null;
    return {
      criterionId,
      label: labels.get(criterionId) ?? { en: criterionId, ar: criterionId },
      before: b,
      after: a,
      pointsDelta,
    };
  });
  return {
    /** Difference of the backend's display_hundredths (integers), e.g. 21 = +0.21. */
    overallDelta:
      before.displayHundredths !== null && after.displayHundredths !== null
        ? after.displayHundredths - before.displayHundredths
        : null,
    criteria,
    hitsBefore: before.prohibitedHits.length,
    hitsAfter: after.prohibitedHits.length,
    versionChanged: before.scorecardVersion !== after.scorecardVersion,
  };
}
