import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import type { AppSettingsInput, BrandingSettingsInput } from '@/shared/types/domain';

export const useAppSettings = () =>
  useApiQuery(['general', 'app'], (api) => api.general.appSettings());
export const useAppVersions = () =>
  useApiQuery(['general', 'appVersions'], (api) => api.general.appSettingsVersions());
export const useBrandingSettings = () =>
  useApiQuery(['general', 'branding'], (api) => api.general.branding());
export const useBrandingVersions = () =>
  useApiQuery(['general', 'brandingVersions'], (api) => api.general.brandingVersions());

export const useSaveApp = () =>
  useApiMutation((api, i: AppSettingsInput) => api.general.saveAppSettings(i), ['general']);
/** Saving branding also refreshes the runtime branding applied to the shell. */
export const useSaveBranding = () =>
  useApiMutation(
    (api, i: BrandingSettingsInput) => api.general.saveBranding(i),
    ['general', 'branding'],
  );
