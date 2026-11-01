import type { ScorecardDraft, ScorecardVersion } from '@/shared/types/domain';
import { arrayOf, num, object, oneOf, str, type Decoded } from '../decode';
import { localizedText } from './common';

export const wireScorecardVersion = object({
  scorecard_id: str,
  version: num,
  name: localizedText,
  low_score_threshold: num,
  criteria: arrayOf(
    object({ id: str, label: localizedText, description: localizedText, weight: num }),
  ),
  prohibited_expressions: arrayOf(object({ id: str, phrase: str, language: oneOf(['ar', 'en']) })),
  created_at: str,
  created_by: str,
  change_note: str,
});

export function scorecardFromWire(w: Decoded<typeof wireScorecardVersion>): ScorecardVersion {
  return {
    scorecardId: w.scorecard_id,
    version: w.version,
    name: w.name,
    lowScoreThreshold: w.low_score_threshold,
    criteria: w.criteria,
    prohibitedExpressions: w.prohibited_expressions,
    createdAt: w.created_at,
    createdBy: w.created_by,
    changeNote: w.change_note,
  };
}

export function scorecardDraftToWire(draft: ScorecardDraft): Record<string, unknown> {
  return {
    name: draft.name,
    low_score_threshold: draft.lowScoreThreshold,
    criteria: draft.criteria.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
      weight: c.weight,
    })),
    prohibited_expressions: draft.prohibitedExpressions.map((p) => ({
      id: p.id,
      phrase: p.phrase.trim(),
      language: p.language,
    })),
    change_note: draft.changeNote.trim(),
  };
}
