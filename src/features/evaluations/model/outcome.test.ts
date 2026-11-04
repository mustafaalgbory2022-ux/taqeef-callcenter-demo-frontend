import { describe, expect, it } from 'vitest';
import { resultPresentation } from './outcome';

const e = (over: Partial<Parameters<typeof resultPresentation>[0]>) => ({
  status: 'completed' as const,
  outcome: 'scored' as const,
  overallScore: 8,
  assessablePoints: 10,
  ...over,
});

describe('result presentation', () => {
  it('keeps scored, insufficient evidence, not assessable and failed distinct', () => {
    expect(resultPresentation(e({}))).toBe('scored');
    expect(
      resultPresentation(
        e({ outcome: 'insufficient_evidence', overallScore: null, assessablePoints: 4 }),
      ),
    ).toBe('insufficient_evidence');
    expect(
      resultPresentation(
        e({ outcome: 'insufficient_evidence', overallScore: null, assessablePoints: 0 }),
      ),
    ).toBe('not_assessable');
    expect(
      resultPresentation(
        e({ status: 'failed', outcome: null, overallScore: null, assessablePoints: 0 }),
      ),
    ).toBe('failed');
  });

  it('never presents a missing score as scored', () => {
    expect(resultPresentation(e({ overallScore: null }))).toBe('insufficient_evidence');
  });
});
