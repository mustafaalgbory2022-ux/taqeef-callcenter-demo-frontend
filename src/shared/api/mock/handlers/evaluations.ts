import { nextId } from '../db';
import { latestScorecard } from '../processing';
import { created, fail, ok, type Route } from '../router';
import { simulateEvaluation } from '../scoring';
import type { MockState } from '../types';

const byCreatedDesc = (a: { created_at: string }, b: { created_at: string }) =>
  Date.parse(b.created_at) - Date.parse(a.created_at);

export function evaluationRoutes(state: MockState, persist: () => void): Route[] {
  return [
    {
      method: 'GET',
      pattern: '/evaluations',
      handler: ({ query }) =>
        ok(
          state.evaluations
            .filter((e) => !query.call_id || e.call_id === query.call_id)
            .filter((e) => !query.agent_id || e.agent_id === query.agent_id)
            .sort(byCreatedDesc),
        ),
    },
    {
      method: 'POST',
      pattern: '/calls/:id/rescore',
      handler: ({ params }) => {
        const call = state.calls.find((c) => c.id === params.id);
        if (!call) return fail(404, 'Call not found.');
        const transcript = state.transcripts[call.id];
        const judgments = state.judgments[call.id];
        if (call.status !== 'scored' || !transcript || !judgments) {
          return fail(409, 'The call has not finished processing.');
        }
        const previous = state.evaluations
          .filter((e) => e.call_id === call.id)
          .sort(byCreatedDesc)[0];
        const evaluation = simulateEvaluation({
          id: nextId(state, 'ev'),
          call,
          segments: transcript.segments,
          judgments,
          scorecard: latestScorecard(state),
          trigger: 'rescore',
          supersedesId: previous?.id ?? null,
          createdAt: new Date().toISOString(),
        });
        state.evaluations.push(evaluation);
        persist();
        return created(evaluation);
      },
    },
  ];
}
