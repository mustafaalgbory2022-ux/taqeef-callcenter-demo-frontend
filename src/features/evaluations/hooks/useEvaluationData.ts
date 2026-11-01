import type { EvaluationFilter } from '@/shared/api/client';
import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';

export const useEvaluations = (filter: EvaluationFilter = {}) =>
  useApiQuery(['evaluations', 'list', filter.callId ?? null, filter.agentId ?? null], (api) =>
    api.listEvaluations(filter),
  );

/** Re-scoring creates a new immutable evaluation; history views refresh automatically. */
export const useRescore = () =>
  useApiMutation((api, callId: string) => api.rescoreCall(callId), ['evaluations', 'calls']);
