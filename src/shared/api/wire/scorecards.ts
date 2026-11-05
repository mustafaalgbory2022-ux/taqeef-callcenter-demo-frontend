import type { ScorecardDraft, ScorecardVersion } from '@/shared/types/domain';
import { arrayOf, bool, nullable, num, object, oneOf, str, type Decoded } from '../decode';
import { localizedText, utcTimestamp } from './common';

export const wireScorecardVersion = object({
  scorecard_id: str,
  version: num,
  name: localizedText,
  low_score_threshold: num,
  minimum_assessable_points: num,
  criteria: arrayOf(
    object({
      id: str,
      label: localizedText,
      description: localizedText,
      max_points: num,
      allow_partial_credit: bool,
    }),
  ),
  prohibited_expressions: arrayOf(object({ id: str, phrase: str, language: oneOf(['ar', 'en']) })),
  prohibited_penalty: object({ points: num, criterion_id: nullable(str) }),
  created_at: utcTimestamp,
  created_by: str,
  change_note: str,
});

export function scorecardFromWire(w: Decoded<typeof wireScorecardVersion>): ScorecardVersion {
  return {
    scorecardId: w.scorecard_id,
    version: w.version,
    name: w.name,
    lowScoreThreshold: w.low_score_threshold,
    minimumAssessablePoints: w.minimum_assessable_points,
    criteria: w.criteria.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
      maxPoints: c.max_points,
      allowPartialCredit: c.allow_partial_credit,
    })),
    prohibitedExpressions: w.prohibited_expressions,
    prohibitedPenalty: {
      points: w.prohibited_penalty.points,
      criterionId: w.prohibited_penalty.criterion_id,
    },
    createdAt: w.created_at,
    createdBy: w.created_by,
    changeNote: w.change_note,
  };
}

export function scorecardDraftToWire(draft: ScorecardDraft): Record<string, unknown> {
  return {
    name: draft.name,
    low_score_threshold: draft.lowScoreThreshold,
    minimum_assessable_points: draft.minimumAssessablePoints,
    criteria: draft.criteria.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
      max_points: c.maxPoints,
      allow_partial_credit: c.allowPartialCredit,
    })),
    prohibited_expressions: draft.prohibitedExpressions.map((p) => ({
      id: p.id,
      phrase: p.phrase.trim(),
      language: p.language,
    })),
    prohibited_penalty: {
      points: draft.prohibitedPenalty.points,
      criterion_id: draft.prohibitedPenalty.points > 0 ? draft.prohibitedPenalty.criterionId : null,
    },
    change_note: draft.changeNote.trim(),
  };
}
