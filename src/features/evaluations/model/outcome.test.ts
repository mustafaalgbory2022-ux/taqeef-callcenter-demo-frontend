import { describe, expect, it } from 'vitest';
import { resultPresentation } from './outcome';

describe('result presentation', () => {
  it('uses the explicit outcome: scored, insufficient evidence and not assessable stay distinct', () => {
    expect(resultPresentation({ outcome: 'scored', overallScore: 8 })).toBe('scored');
    expect(resultPresentation({ outcome: 'insufficient_evidence', overallScore: null })).toBe(
      'insufficient_evidence',
    );
    expect(resultPresentation({ outcome: 'not_assessable', overallScore: null })).toBe(
      'not_assessable',
    );
  });

  it('never presents a missing score as scored', () => {
    expect(resultPresentation({ outcome: 'scored', overallScore: null })).toBe(
      'insufficient_evidence',
    );
  });
});
