import type { Language } from '@/shared/types/domain';
import ar from './locales/ar.json';
import en from './locales/en.json';

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Every valid message key, derived from the English dictionary. */
export type MessageKey = Leaves<typeof en>;
export type MessageVars = Record<string, string | number>;

const dictionaries: Record<Language, unknown> = { en, ar };

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Translate with `{name}` interpolation; falls back to English, then to the key. */
export function translate(lang: Language, key: MessageKey, vars?: MessageVars): string {
  const template = lookup(dictionaries[lang], key) ?? lookup(dictionaries.en, key) ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** Used by the locale parity test. */
export function collectKeys(node: unknown, prefix = ''): string[] {
  if (typeof node !== 'object' || node === null) return [prefix];
  return Object.entries(node).flatMap(([k, v]) => collectKeys(v, prefix ? `${prefix}.${k}` : k));
}

export { ar as arMessages, en as enMessages };
