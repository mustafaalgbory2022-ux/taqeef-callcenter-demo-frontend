import { useApiMutation } from '@/shared/hooks/useApiMutation';
import type { QueueInput, QueueStatus } from '@/shared/types/domain';

/** Queue changes affect agent assignments, dashboards, calls and their history views. */
const AFFECTED = ['queues', 'agents', 'pbx', 'calls'] as const;

export const useCreateQueue = () =>
  useApiMutation((api, input: QueueInput) => api.queueAdmin.create(input), AFFECTED);

export const useUpdateQueue = () =>
  useApiMutation(
    (api, a: { id: string; patch: Partial<QueueInput>; confirm: boolean }) =>
      api.queueAdmin.update(a.id, a.patch, a.confirm),
    AFFECTED,
  );

export const useSetQueueStatus = () =>
  useApiMutation(
    (api, a: { id: string; status: QueueStatus }) => api.queueAdmin.setStatus(a.id, a.status),
    AFFECTED,
  );

export const useAssignQueueAgents = () =>
  useApiMutation(
    (api, a: { id: string; agentIds: readonly string[]; confirm: boolean }) =>
      api.queueAdmin.assignAgents(a.id, a.agentIds, a.confirm),
    AFFECTED,
  );
