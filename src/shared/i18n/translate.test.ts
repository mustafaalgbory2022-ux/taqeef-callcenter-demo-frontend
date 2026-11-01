import { describe, expect, it } from 'vitest';
import { arMessages, collectKeys, enMessages, translate } from './translate';

describe('i18n dictionaries', () => {
  it('Arabic and English define exactly the same keys', () => {
    expect(collectKeys(arMessages).sort()).toEqual(collectKeys(enMessages).sort());
  });

  it('has no empty translations', () => {
    const empty = (node: unknown, path: string): string[] =>
      typeof node === 'string'
        ? node.trim()
          ? []
          : [path]
        : Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
            empty(v, `${path}.${k}`),
          );
    expect([...empty(enMessages, 'en'), ...empty(arMessages, 'ar')]).toEqual([]);
  });

  it('interpolates variables and keeps placeholders consistent across languages', () => {
    expect(translate('en', 'dashboard.sample.title', { n: 5 })).toContain('n = 5');
    expect(translate('ar', 'dashboard.sample.title', { n: 5 })).toContain('n = 5');
    for (const key of collectKeys(enMessages)) {
      const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
      const k = key as Parameters<typeof translate>[1];
      expect(vars(translate('ar', k)), key).toEqual(vars(translate('en', k)));
    }
  });
});
