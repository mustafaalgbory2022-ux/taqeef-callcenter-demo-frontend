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
        // Re-score evaluates the call's CURRENT revision (never re-scored automatically).
        const transcript =
          state.revisions.find(
            (tr) => tr.transcript_revision_id === call.current_transcript_revision_id,
          ) ?? state.transcripts[call.id];
        const judgments = state.judgments[call.id];
        const evaluated = ['scored', 'insufficient_evidence', 'not_assessable'];
        if (!evaluated.includes(call.status) || !transcript || !judgments) {
          return fail(409, 'The call has not finished processing.');
        }
        const previous = state.evaluations
          .filter((e) => e.call_id === call.id)
          .sort(byCreatedDesc)[0];
        const evaluation = simulateEvaluation({
          id: nextId(state, 'ev'),
          call,
          segments: transcript.segments,
          transcriptRevisionId: transcript.transcript_revision_id,
          judgments,
          scorecard: latestScorecard(state),
          trigger: 'rescore',
          supersedesId: previous?.id ?? null,
          createdAt: new Date().toISOString(),
        });
        state.evaluations.push(evaluation);
        call.status = evaluation.outcome;
        persist();
        return created(evaluation);
      },
    },
  ];
}
