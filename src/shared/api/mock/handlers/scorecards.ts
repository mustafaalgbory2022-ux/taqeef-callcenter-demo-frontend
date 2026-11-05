import { isBlank } from '@/shared/utils/validation';
import { created, fail, invalid, ok, type Route } from '../router';
import { latestScorecard } from '../processing';
import type { MockState, WireScorecard } from '../types';

type Draft = Pick<
  WireScorecard,
  | 'name'
  | 'low_score_threshold'
  | 'minimum_assessable_points'
  | 'criteria'
  | 'prohibited_expressions'
  | 'prohibited_penalty'
  | 'change_note'
>;

function validate(d: Draft) {
  if (!d.name || isBlank(d.name.en) || isBlank(d.name.ar)) {
    return invalid('name', 'required');
  }
  const t = d.low_score_threshold;
  if (typeof t !== 'number' || t < 0 || t > 10)
    return invalid('low_score_threshold', 'out_of_range');
  if (!Array.isArray(d.criteria) || d.criteria.length < 1 || d.criteria.length > 12) {
    return invalid('criteria', 'out_of_range');
  }
  for (const c of d.criteria) {
    if (isBlank(c.label.en) || isBlank(c.label.ar)) {
      return invalid('criteria', 'required');
    }
    if (!Number.isInteger(c.max_points) || c.max_points < 1 || c.max_points > 10) {
      return invalid('criteria', 'out_of_range');
    }
    if (typeof c.allow_partial_credit !== 'boolean') return invalid('criteria', 'required');
  }
  const total = d.criteria.reduce((sum, c) => sum + c.max_points, 0);
  const min = d.minimum_assessable_points;
  if (!Number.isInteger(min) || min < 1 || min > total) {
    return invalid('minimum_assessable_points', 'out_of_range');
  }
  const rule = d.prohibited_penalty;
  if (!rule || !Number.isInteger(rule.points) || rule.points < 0 || rule.points > 10) {
    return invalid('prohibited_penalty', 'out_of_range');
  }
  if (rule.points > 0 && !d.criteria.some((c) => c.id === rule.criterion_id)) {
    return invalid('prohibited_penalty', 'required');
  }
  const target = d.criteria.find((c) => c.id === rule.criterion_id);
  if (rule.points > 0 && target && !target.allow_partial_credit) {
    return invalid('prohibited_penalty', 'invalid');
  }
  const phrases = d.prohibited_expressions.map((p) => p.phrase.trim().toLowerCase());
  if (phrases.some((p) => !p)) return invalid('prohibited_expressions', 'required');
  if (new Set(phrases).size !== phrases.length) {
    return invalid('prohibited_expressions', 'duplicate');
  }
  if (isBlank(d.change_note)) return invalid('change_note', 'required');
  return null;
}

export function scorecardRoutes(state: MockState, persist: () => void): Route[] {
  return [
    {
      method: 'GET',
      pattern: '/scorecard/versions',
      handler: () => ok([...state.scorecards].sort((a, b) => b.version - a.version)),
    },
    {
      method: 'GET',
      pattern: '/scorecard/draft',
      handler: () => (state.draft ? ok(state.draft) : fail(404, 'No draft.')),
    },
    {
      method: 'PUT',
      pattern: '/scorecard/draft',
      handler: ({ body }) => {
        state.draft = structuredClone(body);
        persist();
        return ok(state.draft);
      },
    },
    {
      method: 'POST',
      pattern: '/scorecard/activate',
      handler: () => {
        const draft = state.draft as Draft | undefined;
        if (!draft) return fail(409, 'No draft to activate.');
        const error = validate(draft);
        if (error) return error;
        const latest = latestScorecard(state);
        // One transaction: the new version becomes active, the previous one is retired.
        for (const v of state.scorecards) v.status = 'retired';
        state.seq += 1;
        const version: WireScorecard = {
          ...draft,
          scorecard_version_id: `0193a000-0000-7000-8000-${state.seq.toString(16).padStart(12, '0')}`,
          status: 'active',
          scorecard_id: latest.scorecard_id,
          version: latest.version + 1,
          change_note: draft.change_note.trim(),
          created_at: new Date().toISOString(),
          created_by: 'Synthetic administrator',
        };
        state.scorecards.push(version);
        delete state.draft;
        persist();
        return created(version);
      },
    },
  ];
}
