import { describe, expect, it } from 'vitest';
import { resultPresentation } from './outcome';

describe('result presentation', () => {
  it('uses the explicit outcome: scored, insufficient evidence and not assessable stay distinct', () => {
    expect(resultPresentation({ outcome: 'scored', displayHundredths: 800 })).toBe('scored');
    expect(resultPresentation({ outcome: 'insufficient_evidence', displayHundredths: null })).toBe(
      'insufficient_evidence',
    );
    expect(resultPresentation({ outcome: 'not_assessable', displayHundredths: null })).toBe(
      'not_assessable',
    );
  });

  it('never presents a missing score as scored', () => {
    expect(resultPresentation({ outcome: 'scored', displayHundredths: null })).toBe(
      'insufficient_evidence',
    );
  });
});
