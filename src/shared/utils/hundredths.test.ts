import { describe, expect, it } from 'vitest';
import { createFormatters } from '@/shared/i18n/format';
import { exactMeanHundredths, hundredthsParts } from './score';

describe('display_hundredths formatting (contract v0.1 3.4)', () => {
  it('splits with integer arithmetic only', () => {
    expect(hundredthsParts(699)).toEqual({ whole: 6, fraction: '99' });
    expect(hundredthsParts(1000)).toEqual({ whole: 10, fraction: '00' });
    expect(hundredthsParts(7)).toEqual({ whole: 0, fraction: '07' });
  });
  it('rejects non-integers and out-of-range values', () => {
    for (const d of [699.5, -1, 1001, Number.NaN]) expect(() => hundredthsParts(d)).toThrow();
  });
  it('formats in English and Arabic without rounding', () => {
    expect(createFormatters('en').hundredths(699)).toBe('6.99');
    expect(createFormatters('en').hundredthsDelta(699, 720)).toBe('+0.21');
    expect(createFormatters('en').hundredthsDelta(720, 570)).toBe('−1.50');
    const ar = createFormatters('ar').hundredths(699);
    expect(ar.replace(/[^0-9]/g, '')).toBe('699');
  });
});

describe('exactMeanHundredths (exact mean of ratios, truncated)', () => {
  it('uses exact fractions', () => {
    expect(
      exactMeanHundredths([
        { awarded: 2, assessable: 3 },
        { awarded: 1, assessable: 3 },
      ]),
    ).toBe(500);
    expect(exactMeanHundredths([{ awarded: 2, assessable: 3 }])).toBe(666);
  });
  it('returns null without runs and ignores zero denominators', () => {
    expect(exactMeanHundredths([])).toBeNull();
    expect(exactMeanHundredths([{ awarded: 0, assessable: 0 }])).toBeNull();
  });
});
