import type { BrandingSettingsInput } from '@/shared/types/domain';
import { contrastRatio, isHexColor, MIN_CONTRAST, ON_PRIMARY } from './color';

/** Branding rules shared by the form and the simulated backend (PROVISIONAL). */

/** Only locally installed assets under /brand/ (served same-origin, allowed by the CSP). */
export const LOGO_PATH = /^\/brand\/[a-z0-9][a-z0-9._-]{0,80}\.(svg|png|webp)$/;
export const TIMEZONES: readonly string[] = [
  'Asia/Baghdad',
  'UTC',
  'Asia/Riyadh',
  'Asia/Dubai',
  'Europe/London',
];

export type BrandingIssue =
  'logoPath' | 'color' | 'contrast' | 'nameBoth' | 'nameLength' | 'approval';

export function brandingIssues(
  i: BrandingSettingsInput,
): Partial<Record<keyof BrandingSettingsInput, BrandingIssue>> {
  const e: Partial<Record<keyof BrandingSettingsInput, BrandingIssue>> = {};
  for (const k of ['productName', 'organizationName'] as const) {
    const v = i[k];
    if (v && (!v.en.trim() || !v.ar.trim())) e[k] = 'nameBoth';
    else if (v && (v.en.length > 60 || v.ar.length > 60)) e[k] = 'nameLength';
  }
  for (const k of ['logoLightPath', 'logoDarkPath'] as const) {
    const v = i[k];
    if (v && !LOGO_PATH.test(v)) e[k] = 'logoPath';
  }
  for (const [k, mode] of [
    ['lightPrimary', 'light'],
    ['darkPrimary', 'dark'],
  ] as const) {
    const v = i[k];
    if (v && !isHexColor(v)) e[k] = 'color';
    else if (v && contrastRatio(v, ON_PRIMARY[mode]) < MIN_CONTRAST) e[k] = 'contrast';
  }
  const anySet = [
    i.productName,
    i.organizationName,
    i.logoLightPath,
    i.logoDarkPath,
    i.lightPrimary,
    i.darkPrimary,
  ].some(Boolean);
  if (anySet && i.approvalReference.trim().length < 3) e.approvalReference = 'approval';
  return e;
}
