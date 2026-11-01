import type { Language } from '@/api/contract';
import ar from './ar.json';
import en from './en.json';

/**
 * Phase 0 stand-in for i18next. Dictionaries are already in i18next's nested JSON format,
 * so swapping to react-i18next later only replaces this file.
 */
const dictionaries = { en, ar } as const;

export function translate(lang: Language, key: string): string {
  let node: unknown = dictionaries[lang];
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof node === 'string' ? node : key;
}

/** Western digits by default; switch to 'arab' if the local project uses Arabic-Indic digits. */
export const NUMBERING_SYSTEM = 'latn';

export function formatNumber(lang: Language, value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar' : 'en', {
    numberingSystem: NUMBERING_SYSTEM,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
