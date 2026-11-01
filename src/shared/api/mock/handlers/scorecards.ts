import { isBlank } from '@/shared/utils/validation';
import { created, invalid, ok, type Route } from '../router';
import { latestScorecard } from '../processing';
import type { MockState, WireScorecard } from '../types';

type Draft = Pick<
  WireScorecard,
  'name' | 'low_score_threshold' | 'criteria' | 'prohibited_expressions' | 'change_note'
>;

function validate(d: Draft) {
  if (!d.name || isBlank(d.name.en) || isBlank(d.name.ar))
    return invalid('name', 'Name is required in both languages.');
  const t = d.low_score_threshold;
  if (typeof t !== 'number' || t < 0 || t > 10)
    return invalid('low_score_threshold', 'Threshold must be 0–10.');
  if (!Array.isArray(d.criteria) || d.criteria.length < 1 || d.criteria.length > 12) {
    return invalid('criteria', 'A scorecard needs 1–12 criteria.');
  }
  for (const c of d.criteria) {
    if (isBlank(c.label.en) || isBlank(c.label.ar))
      return invalid('criteria', 'Each criterion needs labels in both languages.');
    if (!Number.isInteger(c.weight) || c.weight < 1 || c.weight > 10)
      return invalid('criteria', 'Weights must be whole numbers 1–10.');
  }
  const phrases = d.prohibited_expressions.map((p) => p.phrase.trim().toLowerCase());
  if (phrases.some((p) => !p))
    return invalid('prohibited_expressions', 'Expressions cannot be empty.');
  if (new Set(phrases).size !== phrases.length)
    return invalid('prohibited_expressions', 'Expressions must be unique.');
  if (isBlank(d.change_note)) return invalid('change_note', 'Describe the change.');
  return null;
}

export function scorecardRoutes(state: MockState, persist: () => void): Route[] {
  return [
    { method: 'GET', pattern: '/scorecards/current', handler: () => ok(latestScorecard(state)) },
    {
      method: 'GET',
      pattern: '/scorecards/versions',
      handler: () => ok([...state.scorecards].sort((a, b) => b.version - a.version)),
    },
    {
      method: 'POST',
      pattern: '/scorecards/versions',
      handler: ({ body }) => {
        const draft = body as Draft;
        const error = validate(draft);
        if (error) return error;
        const latest = latestScorecard(state);
        const version: WireScorecard = {
          ...draft,
          scorecard_id: latest.scorecard_id,
          version: latest.version + 1,
          change_note: draft.change_note.trim(),
          created_at: new Date().toISOString(),
          created_by: 'Synthetic administrator',
        };
        state.scorecards.push(version);
        persist();
        return created(version);
      },
    },
  ];
}
