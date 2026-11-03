import type { MessageKey } from '@/shared/i18n/translate';
import type {
  AppSettings,
  AppSettingsInput,
  BrandingSettings,
  BrandingSettingsInput,
} from '@/shared/types/domain';
import { brandingIssues, TIMEZONES, type BrandingIssue } from '@/shared/utils/brandingRules';
import { isEmail } from '@/shared/utils/emailRules';

export const toAppInput = (s: AppSettings): AppSettingsInput => ({
  defaultLanguage: s.defaultLanguage,
  defaultTheme: s.defaultTheme,
  timezone: s.timezone,
  supportContact: s.supportContact,
  loginNotice: s.loginNotice,
  changeNote: '',
});

export type AppField = 'timezone' | 'supportContact' | 'loginNotice' | 'changeNote';

export function validateApp(i: AppSettingsInput): Partial<Record<AppField, MessageKey>> {
  const e: Partial<Record<AppField, MessageKey>> = {};
  if (!TIMEZONES.includes(i.timezone)) e.timezone = 'general.errors.timezone';
  if (i.supportContact.trim() && !isEmail(i.supportContact))
    e.supportContact = 'general.errors.email';
  const en = i.loginNotice.en.trim();
  const ar = i.loginNotice.ar.trim();
  if (Boolean(en) !== Boolean(ar)) e.loginNotice = 'general.errors.bothLanguages';
  else if (en.length > 300 || ar.length > 300) e.loginNotice = 'general.errors.tooLong';
  if (i.changeNote.trim().length < 3) e.changeNote = 'general.errors.changeNote';
  return e;
}

export const APP_SERVER_FIELD: Record<string, AppField> = {
  timezone: 'timezone',
  support_contact: 'supportContact',
  login_notice: 'loginNotice',
  change_note: 'changeNote',
};

export const toBrandingInput = (b: BrandingSettings): BrandingSettingsInput => ({
  productName: b.productName,
  organizationName: b.organizationName,
  logoLightPath: b.logoLightPath,
  logoDarkPath: b.logoDarkPath,
  lightPrimary: b.lightPrimary,
  darkPrimary: b.darkPrimary,
  approvalReference: b.approvalReference,
  changeNote: '',
});

const ISSUE_KEYS: Record<BrandingIssue, MessageKey> = {
  logoPath: 'general.errors.logoPath',
  color: 'general.errors.color',
  contrast: 'general.errors.contrast',
  nameBoth: 'general.errors.bothLanguages',
  nameLength: 'general.errors.tooLong',
  approval: 'general.errors.approval',
};

export function validateBranding(
  i: BrandingSettingsInput,
): Partial<Record<keyof BrandingSettingsInput, MessageKey>> {
  const e = Object.fromEntries(
    Object.entries(brandingIssues(i)).map(([k, v]) => [k, ISSUE_KEYS[v]]),
  ) as Partial<Record<keyof BrandingSettingsInput, MessageKey>>;
  if (i.changeNote.trim().length < 3) e.changeNote = 'general.errors.changeNote';
  return e;
}

export const BRANDING_SERVER_FIELD: Record<string, keyof BrandingSettingsInput> = {
  product_name: 'productName',
  organization_name: 'organizationName',
  logo_light_path: 'logoLightPath',
  logo_dark_path: 'logoDarkPath',
  light_primary: 'lightPrimary',
  dark_primary: 'darkPrimary',
  approval_reference: 'approvalReference',
  change_note: 'changeNote',
};

/** Empty bilingual names mean "use the neutral default". */
export const nameOrNull = (en: string, ar: string) => (en.trim() || ar.trim() ? { en, ar } : null);
