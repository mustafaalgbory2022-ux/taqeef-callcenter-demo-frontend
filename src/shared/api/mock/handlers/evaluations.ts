import { nextId } from '../db';
import { latestScorecard } from '../processing';
import { created, fail, ok, type Route } from '../router';
import { simulateEvaluation } from '../scoring';
import type { MockState } from '../types';
import { serializeRunDetail, serializeRunSummary } from '../serialize';

const byCreatedDesc = (a: { created_at: string }, b: { created_at: string }) =>
  Date.parse(b.created_at) - Date.parse(a.created_at);

export function evaluationRoutes(state: MockState, persist: () => void): Route[] {
  return [
    {
      // Run history of one call (contract v0.3 #18): newest first, ties by greater run_id.
      method: 'GET',
      pattern: '/calls/:id/evaluations',
      handler: ({ params }) => {
        if (!state.calls.some((c) => c.call_id === params.id)) return fail(404, 'Call not found.');
        const items = state.evaluations
          .filter((e) => e.call_id === params.id)
          .sort((a, b) => byCreatedDesc(a, b) || (b.id > a.id ? 1 : -1))
          .map((e) => serializeRunSummary(state, e));
        return ok({ items, truncated: false });
      },
    },
    {
      // Run detail (#19).
      method: 'GET',
      pattern: '/evaluations/:runId',
      handler: ({ params }) => {
        const run = state.evaluations.find((e) => e.id === params.runId);
        return run ? ok(serializeRunDetail(state, run)) : fail(404, 'Run not found.');
      },
    },
    {
      method: 'POST',
      pattern: '/calls/:id/rescore',
      handler: ({ params }) => {
        const call = state.calls.find((c) => c.call_id === params.id);
        if (!call) return fail(404, 'Call not found.');
        // Re-score evaluates the call's CURRENT revision (never re-scored automatically).
        const transcript =
          state.revisions.find(
            (tr) => tr.transcript_revision_id === call.current_transcript_revision_id,
          ) ?? state.transcripts[call.call_id];
        const judgments = state.judgments[call.call_id];
        const evaluated = ['scored', 'insufficient_evidence', 'not_assessable'];
        if (!evaluated.includes(call.status) || !transcript || !judgments) {
          return fail(409, 'The call has not finished processing.');
        }
        const previous = state.evaluations
          .filter((e) => e.call_id === call.call_id)
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
        // PROVISIONAL: v0.3 §8 returns 202 {job_id, call_id, state}; the demo still answers
        // with the new run's detail until jobs are implemented.
        return created(serializeRunDetail(state, evaluation));
      },
    },
  ];
}
