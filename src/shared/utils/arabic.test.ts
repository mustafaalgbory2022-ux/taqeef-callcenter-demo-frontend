import { describe, expect, it } from 'vitest';
import { normalizeTerm, splitList } from './arabic';

describe('Arabic term normalization', () => {
  it('ignores diacritics, tatweel, alef/taa marbuta forms and punctuation', () => {
    expect(normalizeTerm('شْلونَك؟')).toBe(normalizeTerm('شلونك'));
    expect(normalizeTerm('أكو')).toBe(normalizeTerm('اكو'));
    expect(normalizeTerm('هسة')).toBe(normalizeTerm('هسه'));
    expect(normalizeTerm('شكـــو  ماكو')).toBe('شكو ماكو');
    expect(normalizeTerm(' Router ')).toBe('router');
  });

  it('splits lists on Latin and Arabic commas and removes duplicates', () => {
    expect(splitList('هسا، هسع,\nهسا , ')).toEqual(['هسا', 'هسع']);
  });
});
