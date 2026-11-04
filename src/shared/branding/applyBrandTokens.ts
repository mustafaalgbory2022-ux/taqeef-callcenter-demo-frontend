import type { BrandTokens } from '@/shared/types/domain';
import { HEX_COLOR_PATTERN } from '@/shared/utils/validation';

const VARS: Record<keyof BrandTokens, { light: string; dark: string }> = {
  primary: { light: '--brand-primary', dark: '--brand-primary-dark' },
  primaryHover: { light: '--brand-primary-hover', dark: '--brand-primary-dark-hover' },
  primarySoft: { light: '--brand-primary-soft', dark: '--brand-primary-dark-soft' },
  primaryText: { light: '--brand-primary-text', dark: '--brand-primary-dark-text' },
};

/**
 * Logo URLs must be same-origin paths (served by the local backend) or inline images;
 * anything else would be blocked by the CSP or leak requests, so it falls back to default.
 */
export function safeAssetUrl(url: string | null): string | null {
  if (!url) return null;
  // Backslashes are treated as "/" by browsers ("/\\host" → "//host"), and control or
  // percent-encoded separators can hide a scheme or host: reject them outright.
  // eslint-disable-next-line no-control-regex -- control characters are exactly what is rejected
  if (/[\\\u0000-\u001f\u007f]|%2f|%5c/i.test(url)) return null;
  if (/^\/(?!\/)/.test(url)) {
    try {
      const base = window.location.origin;
      const resolved = new URL(url, base);
      return resolved.origin === base ? url : null;
    } catch {
      return null;
    }
  }
  if (/^data:image\/(png|svg\+xml|webp|jpeg);/.test(url)) return url;
  return null;
}

/** Only #rrggbb values are accepted, so runtime branding cannot inject arbitrary CSS. */
export function sanitizeTokens(tokens: BrandTokens): BrandTokens {
  const out: BrandTokens = {};
  for (const key of Object.keys(VARS) as (keyof BrandTokens)[]) {
    const value = tokens[key];
    if (value && HEX_COLOR_PATTERN.test(value)) out[key] = value;
  }
  return out;
}

/**
 * Apply runtime brand colours as CSS custom properties via the CSSOM
 * (permitted under a strict CSP without 'unsafe-inline').
 */
export function applyBrandTokens(
  tokens: { light: BrandTokens; dark: BrandTokens },
  root: HTMLElement = document.documentElement,
): void {
  for (const mode of ['light', 'dark'] as const) {
    const safe = sanitizeTokens(tokens[mode]);
    for (const key of Object.keys(VARS) as (keyof BrandTokens)[]) {
      const name = VARS[key][mode];
      const value = safe[key];
      if (value) root.style.setProperty(name, value);
      else root.style.removeProperty(name);
    }
  }
}
