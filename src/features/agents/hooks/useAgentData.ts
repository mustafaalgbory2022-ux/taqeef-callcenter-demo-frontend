import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import type { AgentInput } from '@/shared/types/domain';

export const useAgents = () => useApiQuery(['agents'], (api) => api.listAgents());
export const useQueues = () => useApiQuery(['queues'], (api) => api.listQueues());
export const useAgentHistory = (id: string | null) =>
  useApiQuery(['agents', 'history', id], (api) => api.getAgentHistory(id ?? ''), {
    enabled: id !== null,
  });

/** Agent changes affect dashboards, calls and evaluations views. */
const AFFECTED = ['agents', 'calls', 'evaluations'] as const;

export const useCreateAgent = () =>
  useApiMutation((api, input: AgentInput) => api.createAgent(input), AFFECTED);

export const useUpdateAgent = () =>
  useApiMutation(
    (api, { id, patch }: { id: string; patch: Partial<AgentInput> }) => api.updateAgent(id, patch),
    AFFECTED,
  );
