import type {
  AppSettings,
  AppSettingsInput,
  BrandingSettings,
  BrandingSettingsInput,
} from '@/shared/types/domain';
import { endpoints } from '../endpoints';
import { listOf, type Send } from '../send';
import {
  appSettingsFromWire,
  appSettingsToWire,
  brandingSettingsFromWire,
  brandingSettingsToWire,
  wireAppSettings,
  wireBrandingSettings,
} from '../wire/general';

/**
 * Application settings and branding administration (PROVISIONAL routes). Saved branding is
 * served to every user through GET /branding; each save is an immutable version.
 */
export interface GeneralApi {
  appSettings(): Promise<AppSettings>;
  appSettingsVersions(): Promise<AppSettings[]>;
  saveAppSettings(i: AppSettingsInput): Promise<AppSettings>;
  branding(): Promise<BrandingSettings>;
  brandingVersions(): Promise<BrandingSettings[]>;
  saveBranding(i: BrandingSettingsInput): Promise<BrandingSettings>;
}

export function createGeneralApi(send: Send): GeneralApi {
  const appVersions = listOf(wireAppSettings, appSettingsFromWire);
  const brandVersions = listOf(wireBrandingSettings, brandingSettingsFromWire);
  return {
    appSettings: () =>
      send({ method: 'GET', path: endpoints.appSettings }, wireAppSettings, appSettingsFromWire),
    appSettingsVersions: () =>
      send(
        { method: 'GET', path: endpoints.appSettingsVersions },
        appVersions.decoder,
        appVersions.map,
      ),
    saveAppSettings: (i) =>
      send(
        { method: 'PUT', path: endpoints.appSettings, body: appSettingsToWire(i) },
        wireAppSettings,
        appSettingsFromWire,
      ),
    branding: () =>
      send(
        { method: 'GET', path: endpoints.brandingSettings },
        wireBrandingSettings,
        brandingSettingsFromWire,
      ),
    brandingVersions: () =>
      send(
        { method: 'GET', path: endpoints.brandingVersions },
        brandVersions.decoder,
        brandVersions.map,
      ),
    saveBranding: (i) =>
      send(
        { method: 'PUT', path: endpoints.brandingSettings, body: brandingSettingsToWire(i) },
        wireBrandingSettings,
        brandingSettingsFromWire,
      ),
  };
}
