import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import type { BackupSettingsInput, RestoreRequest } from '@/shared/types/domain';

const AFFECTED = ['backups', 'storage'] as const;

export const useBackupSettings = () =>
  useApiQuery(['backups', 'settings'], (api) => api.backups.settings());
export const useBackupRuns = () => useApiQuery(['backups', 'runs'], (api) => api.backups.list());
export const useRestores = () =>
  useApiQuery(['backups', 'restores'], (api) => api.backups.restores());
export const useMigration = () =>
  useApiQuery(['backups', 'migration'], (api) => api.backups.migrationReadiness());

export const useSaveBackupSettings = () =>
  useApiMutation((api, i: BackupSettingsInput) => api.backups.saveSettings(i), AFFECTED);
export const useStartBackup = () =>
  useApiMutation((api, note: string) => api.backups.start(note), AFFECTED);
export const useVerifyBackup = () =>
  useApiMutation((api, id: string) => api.backups.verify(id), AFFECTED);
export const useRestore = () =>
  useApiMutation((api, r: RestoreRequest) => api.backups.restore(r), AFFECTED);
