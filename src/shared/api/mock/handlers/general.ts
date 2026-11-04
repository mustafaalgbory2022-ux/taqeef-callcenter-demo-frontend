import type { Decoded } from '../../decode';
import type { wireAppSettings, wireBrandingSettings } from '../../wire/general';
import { brandingIssues, TIMEZONES, type BrandingIssue } from '@/shared/utils/brandingRules';
import { mix } from '@/shared/utils/color';
import { isEmail } from '@/shared/utils/emailRules';
import { ACTOR, recordAudit } from '../audit';
import { created, fail, invalid, ok, type Route } from '../router';
import type { MockState } from '../types';

export type WireAppSettings = Decoded<typeof wireAppSettings>;
export type WireBrandingSettings = Decoded<typeof wireBrandingSettings>;

const AT = '2026-09-15T09:00:00+03:00';

export const initialAppSettings: WireAppSettings = {
  version: 1,
  default_language: 'en',
  default_theme: 'system',
  timezone: 'Asia/Baghdad',
  support_contact: '',
  login_notice: { en: '', ar: '' },
  week_start: 'saturday',
  updated_at: AT,
  updated_by: ACTOR,
  change_note: 'Initial synthetic settings.',
};

/** Neutral placeholder: no company branding is invented. */
export const initialBranding: WireBrandingSettings = {
  version: 1,
  product_name: null,
  organization_name: null,
  logo_light_path: null,
  logo_dark_path: null,
  light_primary: null,
  dark_primary: null,
  approval_reference: '',
  status: 'placeholder',
  updated_at: AT,
  updated_by: ACTOR,
  change_note: 'Neutral placeholder until approved branding is installed locally.',
};

const MESSAGES: Record<BrandingIssue, string> = {
  logoPath: 'Use a local asset path such as /brand/logo-light.svg.',
  color: 'Use a #rrggbb colour.',
  contrast: 'The colour does not reach 4.5:1 contrast with its text colour.',
  nameBoth: 'Enter both the English and the Arabic name, or neither.',
  nameLength: 'Use at most 60 characters.',
  approval: 'Enter the branding approval reference.',
};
const WIRE = {
  productName: 'product_name',
  organizationName: 'organization_name',
  logoLightPath: 'logo_light_path',
  logoDarkPath: 'logo_dark_path',
  lightPrimary: 'light_primary',
  darkPrimary: 'dark_primary',
  approvalReference: 'approval_reference',
  changeNote: 'change_note',
} as const;

const current = <T>(list: T[]) => {
  const v = list.at(-1);
  if (!v) throw new Error('No settings version');
  return v;
};

/** Runtime branding served to every user (GET /branding), derived from the latest version. */
export function servedBranding(state: MockState) {
  const b = current(state.general.branding);
  const tokens = (hex: string | null, mode: 'light' | 'dark') =>
    hex
      ? {
          primary: hex,
          primary_hover: mix(hex, mode === 'light' ? -0.15 : 0.15),
          primary_soft: mix(hex, mode === 'light' ? 0.88 : -0.75),
          primary_text: mode === 'light' ? mix(hex, -0.1) : mix(hex, 0.35),
        }
      : null;
  return {
    product_name: b.product_name,
    organization_name: b.organization_name,
    logo_light_url: b.logo_light_path,
    logo_dark_url: b.logo_dark_path ?? b.logo_light_path,
    tokens: { light: tokens(b.light_primary, 'light'), dark: tokens(b.dark_primary, 'dark') },
  };
}

export function generalRoutes(state: MockState, persist: () => void): Route[] {
  const g = state.general;
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const name = (v: unknown) =>
    v && typeof v === 'object' && 'en' in v && 'ar' in v
      ? { en: s((v as { en: unknown }).en), ar: s((v as { ar: unknown }).ar) }
      : null;
  const nullableName = (v: unknown) => {
    const n = name(v);
    return n && (n.en || n.ar) ? n : null;
  };

  return [
    { method: 'GET', pattern: '/settings/application', handler: () => ok(current(g.app)) },
    {
      method: 'GET',
      pattern: '/settings/application/versions',
      handler: () => ok([...g.app].reverse()),
    },
    {
      method: 'PUT',
      pattern: '/settings/application',
      handler: ({ body }) => {
        const b = (body ?? {}) as Record<string, unknown>;
        if (b.default_language !== 'ar' && b.default_language !== 'en')
          return invalid('default_language', 'Choose Arabic or English.');
        if (!['light', 'dark', 'system'].includes(String(b.default_theme)))
          return invalid('default_theme', 'Choose a theme.');
        if (!TIMEZONES.includes(String(b.timezone)))
          return invalid('timezone', 'Choose a supported time zone.');
        if (s(b.support_contact) && !isEmail(s(b.support_contact)))
          return invalid('support_contact', 'Enter a valid email address or leave it empty.');
        const notice = name(b.login_notice) ?? { en: '', ar: '' };
        if (notice.en.length > 300 || notice.ar.length > 300)
          return invalid('login_notice', 'Use at most 300 characters.');
        if (Boolean(notice.en) !== Boolean(notice.ar))
          return invalid('login_notice', 'Enter the notice in both languages, or neither.');
        if (s(b.change_note).length < 3) return invalid('change_note', 'Describe the change.');
        const before = current(g.app);
        const next: WireAppSettings = {
          ...before,
          default_language: b.default_language,
          default_theme: b.default_theme as WireAppSettings['default_theme'],
          timezone: String(b.timezone),
          support_contact: s(b.support_contact),
          login_notice: notice,
          version: before.version + 1,
          updated_at: new Date().toISOString(),
          updated_by: ACTOR,
          change_note: s(b.change_note),
        };
        const keys = [
          'default_language',
          'default_theme',
          'timezone',
          'support_contact',
          'login_notice',
        ] as const;
        const changes = keys.flatMap((k) =>
          JSON.stringify(before[k]) === JSON.stringify(next[k])
            ? []
            : [{ field: k, before: JSON.stringify(before[k]), after: JSON.stringify(next[k]) }],
        );
        if (!changes.length) return fail(409, 'No changes compared with the current version.');
        g.app.push(next);
        recordAudit(state, {
          resource: 'app_settings',
          resourceId: `v${next.version}`,
          action: 'version_saved',
          summary: `Application settings v${next.version}: ${next.change_note}`,
          changes,
        });
        persist();
        return created(next);
      },
    },
    { method: 'GET', pattern: '/settings/branding', handler: () => ok(current(g.branding)) },
    {
      method: 'GET',
      pattern: '/settings/branding/versions',
      handler: () => ok([...g.branding].reverse()),
    },
    {
      method: 'PUT',
      pattern: '/settings/branding',
      handler: ({ body }) => {
        const b = (body ?? {}) as Record<string, unknown>;
        const input = {
          productName: nullableName(b.product_name),
          organizationName: nullableName(b.organization_name),
          logoLightPath: s(b.logo_light_path) || null,
          logoDarkPath: s(b.logo_dark_path) || null,
          lightPrimary: s(b.light_primary).toLowerCase() || null,
          darkPrimary: s(b.dark_primary).toLowerCase() || null,
          approvalReference: s(b.approval_reference),
          changeNote: s(b.change_note),
        };
        const issues = Object.entries(brandingIssues(input)) as [
          keyof typeof WIRE,
          BrandingIssue,
        ][];
        const first = issues[0];
        if (first) return invalid(WIRE[first[0]], MESSAGES[first[1]]);
        if (input.changeNote.length < 3) return invalid('change_note', 'Describe the change.');
        const before = current(g.branding);
        const next: WireBrandingSettings = {
          version: before.version + 1,
          product_name: input.productName,
          organization_name: input.organizationName,
          logo_light_path: input.logoLightPath,
          logo_dark_path: input.logoDarkPath,
          light_primary: input.lightPrimary,
          dark_primary: input.darkPrimary,
          approval_reference: input.approvalReference,
          status: [
            input.productName,
            input.organizationName,
            input.logoLightPath,
            input.logoDarkPath,
            input.lightPrimary,
            input.darkPrimary,
          ].some(Boolean)
            ? 'configured'
            : 'placeholder',
          updated_at: new Date().toISOString(),
          updated_by: ACTOR,
          change_note: input.changeNote,
        };
        const keys = [
          'product_name',
          'organization_name',
          'logo_light_path',
          'logo_dark_path',
          'light_primary',
          'dark_primary',
          'approval_reference',
        ] as const;
        const changes = keys.flatMap((k) =>
          JSON.stringify(before[k]) === JSON.stringify(next[k])
            ? []
            : [{ field: k, before: JSON.stringify(before[k]), after: JSON.stringify(next[k]) }],
        );
        if (!changes.length) return fail(409, 'No changes compared with the current version.');
        g.branding.push(next);
        recordAudit(state, {
          resource: 'branding',
          resourceId: `v${next.version}`,
          action: 'version_saved',
          summary: `Branding v${next.version} (${next.status}): ${next.change_note}`,
          changes,
        });
        persist();
        return created(next);
      },
    },
  ];
}
