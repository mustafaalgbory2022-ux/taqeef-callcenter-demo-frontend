import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import type { AiConfigDraft } from '@/shared/types/domain';

export const useAiModels = () => useApiQuery(['ai', 'models'], (api) => api.ai.listModels());
export const useAiConfig = () => useApiQuery(['ai', 'config'], (api) => api.ai.getCurrentConfig());
export const useAiConfigVersions = () =>
  useApiQuery(['ai', 'versions'], (api) => api.ai.listConfigVersions());

/** Poll quickly while a model is switching, slowly otherwise. */
export const useAiStatus = () =>
  useApiQuery(['ai', 'status'], (api) => api.ai.getStatus(), {
    refetchIntervalMs: (s) => (s?.services.some((x) => x.state === 'loading') ? 2000 : 15_000),
  });

export const useAiJobs = () =>
  useApiQuery(['ai', 'jobs'], (api) => api.ai.getJobs(), { refetchIntervalMs: 5000 });

export const useSaveAiConfig = () =>
  useApiMutation((api, draft: AiConfigDraft) => api.ai.saveConfig(draft), ['ai']);

export type JobAction =
  { kind: 'pause' } | { kind: 'resume' } | { kind: 'retry' | 'cancel'; id: string };

export const useJobAction = () =>
  useApiMutation(
    (api, a: JobAction) => {
      switch (a.kind) {
        case 'pause':
          return api.ai.pauseJobs();
        case 'resume':
          return api.ai.resumeJobs();
        case 'retry':
          return api.ai.retryJob(a.id);
        case 'cancel':
          return api.ai.cancelJob(a.id);
      }
    },
    ['ai'],
  );
