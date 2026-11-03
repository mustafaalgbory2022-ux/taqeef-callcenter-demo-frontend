import type {
  AppSettings,
  AppSettingsInput,
  BrandingSettings,
  BrandingSettingsInput,
} from '@/shared/types/domain';
import { nullable, num, object, oneOf, str, type Decoded } from '../decode';
import { localizedText } from './common';

/* PROVISIONAL wire shapes for application settings and branding administration. */

export const wireAppSettings = object({
  version: num,
  default_language: oneOf(['ar', 'en']),
  default_theme: oneOf(['light', 'dark', 'system']),
  timezone: str,
  support_contact: str,
  login_notice: localizedText,
  week_start: oneOf(['saturday']),
  updated_at: str,
  updated_by: str,
  change_note: str,
});

export function appSettingsFromWire(w: Decoded<typeof wireAppSettings>): AppSettings {
  return {
    version: w.version,
    defaultLanguage: w.default_language,
    defaultTheme: w.default_theme,
    timezone: w.timezone,
    supportContact: w.support_contact,
    loginNotice: w.login_notice,
    weekStart: w.week_start,
    updatedAt: w.updated_at,
    updatedBy: w.updated_by,
    changeNote: w.change_note,
  };
}

export const appSettingsToWire = (i: AppSettingsInput) => ({
  default_language: i.defaultLanguage,
  default_theme: i.defaultTheme,
  timezone: i.timezone,
  support_contact: i.supportContact.trim(),
  login_notice: { en: i.loginNotice.en.trim(), ar: i.loginNotice.ar.trim() },
  change_note: i.changeNote.trim(),
});

export const wireBrandingSettings = object({
  version: num,
  product_name: nullable(localizedText),
  organization_name: nullable(localizedText),
  logo_light_path: nullable(str),
  logo_dark_path: nullable(str),
  light_primary: nullable(str),
  dark_primary: nullable(str),
  approval_reference: str,
  status: oneOf(['placeholder', 'configured']),
  updated_at: str,
  updated_by: str,
  change_note: str,
});

export function brandingSettingsFromWire(
  w: Decoded<typeof wireBrandingSettings>,
): BrandingSettings {
  return {
    version: w.version,
    productName: w.product_name,
    organizationName: w.organization_name,
    logoLightPath: w.logo_light_path,
    logoDarkPath: w.logo_dark_path,
    lightPrimary: w.light_primary,
    darkPrimary: w.dark_primary,
    approvalReference: w.approval_reference,
    status: w.status,
    updatedAt: w.updated_at,
    updatedBy: w.updated_by,
    changeNote: w.change_note,
  };
}

const blank = (v: string | null) => (v && v.trim() ? v.trim() : null);

export const brandingSettingsToWire = (i: BrandingSettingsInput) => ({
  product_name: i.productName,
  organization_name: i.organizationName,
  logo_light_path: blank(i.logoLightPath),
  logo_dark_path: blank(i.logoDarkPath),
  light_primary: blank(i.lightPrimary)?.toLowerCase() ?? null,
  dark_primary: blank(i.darkPrimary)?.toLowerCase() ?? null,
  approval_reference: i.approvalReference.trim(),
  change_note: i.changeNote.trim(),
});
