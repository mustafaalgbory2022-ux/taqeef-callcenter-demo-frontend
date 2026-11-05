import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import type { AgentInput } from '@/shared/types/domain';

/**
 * Agents list. Default: active agents only (upload, new work). History views (admin,
 * dashboards, filters, call pages) pass `includeRetired` so earlier calls keep their agent.
 */
export const useAgents = ({ includeRetired = false }: { includeRetired?: boolean } = {}) =>
  useApiQuery(['agents', includeRetired ? 'all' : 'active'], (api) =>
    api.listAgents({ includeRetired }),
  );
export const useAgentHistory = (id: string | null) =>
  useApiQuery(['agents', 'history', id], (api) => api.getAgentHistory(id ?? ''), {
    enabled: id !== null,
  });

/** Agent changes affect dashboards, calls and evaluations views. */
const AFFECTED = ['agents', 'calls', 'evaluations'] as const;

export const useCreateAgent = () =>
  useApiMutation((api, input: AgentInput) => api.createAgent(input), AFFECTED);

export const useRetireAgent = () =>
  useApiMutation((api, id: string) => api.retireAgent(id), AFFECTED);
