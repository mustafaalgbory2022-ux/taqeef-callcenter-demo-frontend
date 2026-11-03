import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import type { RecoverableType, StorageSettingsInput } from '@/shared/types/domain';

/** Moving items affects calls and reports as well as storage views. */
const AFFECTED = ['storage', 'calls', 'reports'] as const;

export const useStorageOverview = () =>
  useApiQuery(['storage', 'overview'], (api) => api.storage.overview(), {
    refetchIntervalMs: 30_000,
  });
export const useStorageSettings = () =>
  useApiQuery(['storage', 'settings'], (api) => api.storage.settings());
export const useRecovery = () =>
  useApiQuery(['storage', 'recovery'], (api) => api.storage.recovery());

export const useSaveStorage = () =>
  useApiMutation(
    (api, a: { input: StorageSettingsInput; confirm: boolean }) =>
      api.storage.saveSettings(a.input, a.confirm),
    AFFECTED,
  );
export const useMoveToRecovery = () =>
  useApiMutation(
    (api, a: { type: RecoverableType; id: string; reason: string }) =>
      api.storage.moveToRecovery(a.type, a.id, a.reason),
    AFFECTED,
  );
export const useRestore = () =>
  useApiMutation((api, id: string) => api.storage.restore(id), AFFECTED);
