import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import type { SystemErrorQuery } from '@/shared/types/domain';

export const useHealth = () =>
  useApiQuery(['system', 'health'], (api) => api.system.health(), { refetchIntervalMs: 10_000 });
export const useSystemErrors = (q: SystemErrorQuery) =>
  useApiQuery(['system', 'errors', q], (api) => api.system.errors(q), {
    refetchIntervalMs: 30_000,
  });
export const useAcknowledge = () =>
  useApiMutation((api, id: string) => api.system.acknowledge(id), ['system']);
