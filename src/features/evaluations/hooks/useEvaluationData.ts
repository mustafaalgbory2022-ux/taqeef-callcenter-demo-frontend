import type { EvaluationFilter } from '@/shared/api/client';
import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';

/**
 * Runs for a view, composed from the documented routes only (contract v0.3 has no
 * cross-call run list): the call list (#8, hidden calls excluded) → each call's run history
 * (#18) → each run's detail (#19). Runs are sealed, so this is the immutable history. The
 * agent is taken from the call, because a run carries no agent.
 */
export const useEvaluations = (filter: EvaluationFilter = {}) =>
  useApiQuery(
    ['evaluations', 'list', filter.callId ?? null, filter.agentId ?? null],
    async (api) => {
      const calls = filter.callId
        ? [{ id: filter.callId, agentId: null as string | null }]
        : await api.listCalls({ agentId: filter.agentId });
      const perCall = await Promise.all(
        calls.map(async (call) => {
          const history = await api.listRunHistory(call.id);
          const runs = await Promise.all(history.map((h) => api.getRun(h.runId)));
          return runs.map((r) => ({ ...r, agentId: call.agentId }));
        }),
      );
      return perCall.flat();
    },
  );

/** Re-scoring creates a new immutable evaluation; history views refresh automatically. */
export const useRescore = () =>
  useApiMutation((api, callId: string) => api.rescoreCall(callId), ['evaluations', 'calls']);
