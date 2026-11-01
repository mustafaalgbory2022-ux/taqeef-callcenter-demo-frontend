import { describe, expect, it } from 'vitest';
import { computeOverallScore, scoreBand } from './scoring';
import type { ScorecardCriterion } from './scorecards';

const crit = (id: string, weight: number): ScorecardCriterion => ({
  id,
  weight,
  label: { en: id, ar: id },
  anchors: [],
});

const s = (criterionId: string, score: number) => ({
  criterionId,
  score,
  rationale: '',
  evidence: [],
});

describe('computeOverallScore', () => {
  it('returns the weighted mean rounded to one decimal', () => {
    expect(computeOverallScore([crit('a', 1), crit('b', 3)], [s('a', 10), s('b', 6)])).toBe(7);
    expect(computeOverallScore([crit('a', 1), crit('b', 2)], [s('a', 9), s('b', 7)])).toBe(7.7);
  });

  it('ignores criteria without a score and returns null when none are scored', () => {
    expect(computeOverallScore([crit('a', 1), crit('b', 5)], [s('a', 8)])).toBe(8);
    expect(computeOverallScore([crit('a', 1)], [])).toBeNull();
  });
});

describe('scoreBand', () => {
  it('bands relative to the pass threshold', () => {
    expect(scoreBand(7, 7)).toBe('high');
    expect(scoreBand(5, 7)).toBe('mid');
    expect(scoreBand(4.9, 7)).toBe('low');
  });
});
