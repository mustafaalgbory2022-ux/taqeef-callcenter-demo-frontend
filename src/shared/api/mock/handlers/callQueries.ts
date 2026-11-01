import type { MockState, WireCall, WireEvaluation } from '../types';

export const DEFAULT_REVIEW: WireCall['review'] = {
  status: 'unreviewed',
  note: '',
  reviewed_by: null,
  reviewed_at: null,
};

/** Local calendar date of a recorded_at timestamp (synthetic data uses +03:00). */
export const callDate = (call: Pick<WireCall, 'recorded_at'>) => call.recorded_at.slice(0, 10);

export function inRange(date: string, from?: string, to?: string): boolean {
  return (!from || date >= from) && (!to || date <= to);
}

/** Latest completed evaluation per call (mirrors the frontend rule). */
export function currentByCall(state: MockState): Map<string, WireEvaluation> {
  const map = new Map<string, WireEvaluation>();
  for (const e of state.evaluations) {
    if (e.status !== 'completed') continue;
    const prev = map.get(e.call_id);
    if (!prev || e.created_at > prev.created_at) map.set(e.call_id, e);
  }
  return map;
}

export function scoreBand(
  state: MockState,
  e: WireEvaluation | undefined,
): 'low' | 'meets' | 'no_score' | 'unscored' {
  if (!e) return 'unscored';
  if (e.outcome !== 'scored' || e.overall_score === null) return 'no_score';
  const version = state.scorecards.find((v) => v.version === e.scorecard_version);
  return e.overall_score < (version?.low_score_threshold ?? 7) - 1e-9 ? 'low' : 'meets';
}

export function filterCalls(
  state: MockState,
  q: Readonly<Record<string, string | undefined>>,
): WireCall[] {
  const current = currentByCall(state);
  const search = q.search?.trim().toLowerCase();
  return state.calls
    .filter((c) => inRange(callDate(c), q.from, q.to))
    .filter((c) => !q.agent_id || c.agent_id === q.agent_id)
    .filter((c) => !q.queue_id || c.queue_id === q.queue_id)
    .filter((c) => !q.reason || c.classification?.reason === q.reason)
    .filter(
      (c) => !q.review_status || (state.reviews[c.id] ?? DEFAULT_REVIEW).status === q.review_status,
    )
    .filter((c) => !q.score_band || scoreBand(state, current.get(c.id)) === q.score_band)
    .filter(
      (c) =>
        !search || c.id.toLowerCase().includes(search) || c.title.toLowerCase().includes(search),
    )
    .sort((a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at));
}
