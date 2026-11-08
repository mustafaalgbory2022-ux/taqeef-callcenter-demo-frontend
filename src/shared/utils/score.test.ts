import { describe, expect, it } from 'vitest';
import type { Criterion, CriterionEvaluation } from '@/shared/types/domain';
import { floorTo2, isLowScore, isValidAward, normalizeToTen, scoreEvaluation } from './score';

/** The approved default card: 1 + 1 + 2 + 3 + 2 + 1 = 10 points. */
const card: Criterion[] = [
  ['greeting', 1],
  ['verification', 1],
  ['needs', 2],
  ['resolution', 3],
  ['language', 2],
  ['closing', 1],
].map(([id, maxPoints]) => ({
  id: String(id),
  maxPoints: Number(maxPoints),
  allowPartialCredit: true,
  label: { en: String(id), ar: String(id) },
  description: { en: '', ar: '' },
}));

const scored = (criterionId: string, awardedUnits: number): CriterionEvaluation => ({
  criterionId,
  result: 'partially_met',
  reasonCode: null,
  aiDeclaredReason: null,
  unit: 1,
  awardedUnits,
  possibleUnits: 0,
  criterionVersion: 1,
  name: { en: 'c', ar: 'c' },
  order: 1,
  levelId: null,
  source: 'ai' as const,
  aiOriginalDecision: null,
  rationale: '',
  explanationTruncated: false,
  evidence: [],
});
const notScored = (
  criterionId: string,
  kind: 'not_assessable' | 'insufficient_evidence',
): CriterionEvaluation => ({
  ...scored(criterionId, 0),
  result: 'not_assessable',
  reasonCode: 'ai_declared',
  aiDeclaredReason: kind === 'insufficient_evidence' ? 'insufficient_evidence' : 'not_applicable',
  unit: 1,
  awardedUnits: null,
});

describe('floorTo2', () => {
  it('always rounds down to two decimals, robust to floating point', () => {
    expect(floorTo2(6.666)).toBe(6.66);
    expect(floorTo2(8.995)).toBe(8.99);
    expect(floorTo2(0.1 + 0.2)).toBe(0.3);
    expect(floorTo2((7 * 3) / 3)).toBe(7);
  });
});

describe('isLowScore', () => {
  it('is strictly below the threshold', () => {
    expect(isLowScore(6.99)).toBe(true);
    expect(isLowScore(7)).toBe(false);
    expect(isLowScore((7 + 29 / 3 + 13 / 3) / 3)).toBe(false); // exactly 7, computes as 6.999…
  });
});

describe('isValidAward', () => {
  it('allows partial credit only when configured', () => {
    expect(isValidAward(2, { maxPoints: 3, allowPartialCredit: true })).toBe(true);
    expect(isValidAward(2, { maxPoints: 3, allowPartialCredit: false })).toBe(false);
    expect(isValidAward(3, { maxPoints: 3, allowPartialCredit: false })).toBe(true);
    expect(isValidAward(1.5, { maxPoints: 3, allowPartialCredit: true })).toBe(false);
    expect(isValidAward(4, { maxPoints: 3, allowPartialCredit: true })).toBe(false);
  });
});

describe('scoreEvaluation', () => {
  it('scores actual awarded points over assessable points', () => {
    const results = [
      scored('greeting', 1),
      scored('verification', 1),
      scored('needs', 1),
      scored('resolution', 3),
      scored('language', 2),
      scored('closing', 1),
    ];
    expect(scoreEvaluation(card, results, 6)).toEqual({
      awardedUnits: 9,
      assessableUnits: 10,
      possibleUnits: 10,
      outcome: 'scored',
      overallScore: 9,
    });
  });

  it('excludes not-assessable criteria from the denominator', () => {
    const results = [
      scored('greeting', 1),
      notScored('verification', 'not_assessable'),
      scored('needs', 2),
      scored('resolution', 2),
      scored('language', 2),
      scored('closing', 1),
    ];
    const s = scoreEvaluation(card, results, 6);
    expect(s).toMatchObject({ awardedUnits: 8, assessableUnits: 9, outcome: 'scored' });
    expect(floorTo2(s.overallScore ?? 0)).toBe(8.88);
  });

  it('scores at exactly the minimum of 6 assessable points', () => {
    const results = [
      scored('greeting', 1),
      scored('verification', 1),
      scored('needs', 1),
      notScored('resolution', 'insufficient_evidence'),
      scored('language', 2),
      notScored('closing', 'insufficient_evidence'),
    ];
    expect(scoreEvaluation(card, results, 6)).toMatchObject({
      assessableUnits: 6,
      awardedUnits: 5,
      outcome: 'scored',
    });
  });

  it('gives no score below the minimum assessable points', () => {
    const results = [
      scored('greeting', 1),
      scored('verification', 1),
      notScored('needs', 'insufficient_evidence'),
      notScored('resolution', 'insufficient_evidence'),
      scored('language', 2),
      notScored('closing', 'insufficient_evidence'),
    ];
    expect(scoreEvaluation(card, results, 6)).toMatchObject({
      assessableUnits: 4,
      outcome: 'insufficient_evidence',
      overallScore: null,
    });
  });

  it('normalizes to ten', () => {
    expect(normalizeToTen(5, 8)).toBe(6.25);
    expect(normalizeToTen(0, 0)).toBeNull();
  });
});
