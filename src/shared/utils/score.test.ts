import { describe, expect, it } from 'vitest';
import type { Criterion, CriterionEvaluation } from '@/shared/types/domain';
import { computeOverallScore, floorTo2, isLowScore, isWholePointScore } from './score';

const criterion = (id: string, weight = 1): Criterion => ({
  id,
  weight,
  label: { en: id, ar: id },
  description: { en: '', ar: '' },
});

const result = (
  criterionId: string,
  score: number | null,
  kind: CriterionEvaluation['result'] = 'scored',
): CriterionEvaluation => ({ criterionId, result: kind, score, rationale: '', evidence: [] });

describe('floorTo2', () => {
  it('always rounds down to two decimals', () => {
    expect(floorTo2(6.666)).toBe(6.66);
    expect(floorTo2(6.669999)).toBe(6.66);
    expect(floorTo2(8.995)).toBe(8.99);
    expect(floorTo2(7)).toBe(7);
  });

  it('is not fooled by floating-point error', () => {
    expect(floorTo2(0.1 + 0.2)).toBe(0.3);
    expect(floorTo2((7 * 3) / 3)).toBe(7);
    expect(floorTo2(1.15 * 100) / 100).toBe(1.15);
  });
});

describe('isLowScore', () => {
  it('is strictly below the threshold', () => {
    expect(isLowScore(6.99)).toBe(true);
    expect(isLowScore(6.999)).toBe(true);
    expect(isLowScore(7)).toBe(false);
    expect(isLowScore(7.5, 8)).toBe(true);
    expect(isLowScore((7 + 29 / 3 + 13 / 3) / 3)).toBe(false); // exactly 7, computes as 6.999…
  });
});

describe('isWholePointScore', () => {
  it('accepts integers 0–10 only', () => {
    expect(isWholePointScore(0)).toBe(true);
    expect(isWholePointScore(10)).toBe(true);
    expect(isWholePointScore(7.5)).toBe(false);
    expect(isWholePointScore(11)).toBe(false);
  });
});

describe('computeOverallScore', () => {
  it('is the weighted mean of scored criteria', () => {
    const criteria = [criterion('a', 1), criterion('b', 2)];
    expect(computeOverallScore(criteria, [result('a', 9), result('b', 6)])).toBe(7);
  });

  it('excludes not-assessable and insufficient-evidence criteria', () => {
    const criteria = [criterion('a'), criterion('b'), criterion('c')];
    const results = [
      result('a', 8),
      result('b', null, 'not_assessable'),
      result('c', null, 'insufficient_evidence'),
    ];
    expect(computeOverallScore(criteria, results)).toBe(8);
  });

  it('returns null when nothing was scored', () => {
    expect(computeOverallScore([criterion('a')], [result('a', null, 'not_assessable')])).toBeNull();
  });
});
