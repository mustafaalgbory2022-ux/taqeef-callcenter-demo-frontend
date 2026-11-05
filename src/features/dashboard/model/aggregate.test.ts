import { describe, expect, it } from 'vitest';
import type { CriterionEvaluation, Evaluation, ScorecardVersion } from '@/shared/types/domain';
import { currentEvaluations, filterByVersion, summarize } from './aggregate';

const version = (v: number, threshold = 7): ScorecardVersion => ({
  scorecardId: 'sc',
  version: v,
  name: { en: '', ar: '' },
  lowScoreThreshold: threshold,
  minimumAssessablePoints: 6,
  criteria: [
    {
      id: 'c1',
      label: { en: 'C1', ar: 'C1' },
      description: { en: '', ar: '' },
      maxPoints: 10,
      allowPartialCredit: true,
    },
  ],
  prohibitedExpressions: [],
  prohibitedPenalty: { points: 0, criterionId: null },
  createdAt: '',
  createdBy: '',
  changeNote: '',
});

let seq = 0;
/** score = awarded points of a single 10-point criterion; null = insufficient evidence. */
const ev = (
  callId: string,
  agentId: string,
  score: number | null,
  createdAt: string,
  v = 1,
): Evaluation => {
  const criterion: CriterionEvaluation =
    score === null
      ? {
          criterionId: 'c1',
          result: 'not_assessable',
          reasonCode: 'ai_declared',
          aiDeclaredReason: 'insufficient_evidence',
          awardedPoints: null,
          possiblePoints: 10,
          penaltyPoints: 0,
          rationale: '',
          evidence: [],
        }
      : {
          criterionId: 'c1',
          result: 'partially_met',
          reasonCode: null,
          aiDeclaredReason: null,
          awardedPoints: score,
          possiblePoints: 10,
          penaltyPoints: 0,
          rationale: '',
          evidence: [],
        };
  return {
    id: `e${++seq}`,
    callId,
    agentId,
    scorecardId: 'sc',
    scorecardVersion: v,
    transcriptRevisionId: '0193a000-0000-7000-8000-000000000001',
    outcome: score === null ? 'insufficient_evidence' : 'scored',
    awardedPoints: score ?? 0,
    assessablePoints: score === null ? 0 : 10,
    possiblePoints: 10,
    minimumAssessablePoints: 6,
    // Simulated backend values: score × 100 for a single 10-point criterion; the low flag is
    // fixed with the evaluating version's threshold (v1: 7.00, v2: 8.00 in these tests).
    displayHundredths: score === null ? null : score * 100,
    belowThreshold: score === null ? null : score < (v === 2 ? 8 : 7),
    thresholdHundredths: v === 2 ? 800 : 700,
    criteria: [criterion],
    prohibitedHits: [],
    trigger: 'initial',
    supersedesId: null,
    createdAt,
    simulated: true,
  };
};

const T = '2026-10-01T00:00:00Z';

describe('currentEvaluations', () => {
  it('uses the latest run of each call (a failed evaluation creates no run)', () => {
    const old = ev('call1', 'a', 5, T);
    const rescore = ev('call1', 'a', 8, '2026-10-02T00:00:00Z');
    expect(currentEvaluations([old, rescore])).toEqual([rescore]);
  });

  it('never falls back to an older score when the latest is insufficient evidence', () => {
    const old = ev('call1', 'a', 8, T);
    const insufficient = ev('call1', 'a', null, '2026-10-02T00:00:00Z');
    expect(currentEvaluations([old, insufficient])).toEqual([insufficient]);
  });
});

describe('summarize — exact mean and backend flags', () => {
  const scoredRun = (id: string, awarded: number, assessable: number, d: number, low: boolean) => ({
    ...ev(id, 'a', 1, T),
    awardedPoints: awarded,
    assessablePoints: assessable,
    displayHundredths: d,
    belowThreshold: low,
  });

  it('averages the exact ratios, not the truncated displayed scores', () => {
    // 2/3 → 6.666… (shown 6.66) and 1/3 → 3.333… (shown 3.33). Exact mean = 5.00;
    // averaging the displayed values would give 4.99.
    const s = summarize(
      [scoredRun('1', 2, 3, 666, true), scoredRun('2', 1, 3, 333, true)],
      [version(1)],
    );
    expect(s.averageHundredths).toBe(500);
  });

  it('truncates the exact mean, never rounds up', () => {
    const s = summarize(
      [
        scoredRun('1', 7, 10, 700, false),
        scoredRun('2', 6, 9, 666, true),
        scoredRun('3', 3, 4, 750, false),
      ],
      [version(1)],
    );
    // (0.7 + 0.6667 + 0.75) / 3 = 0.70555… → 705
    expect(s.averageHundredths).toBe(705);
  });

  it('counts low scores from the backend flag, even when the threshold changed later', () => {
    // A 7.50 run flagged low by its own (older, higher) threshold stays low.
    const s = summarize([scoredRun('1', 3, 4, 750, true)], [version(1)]);
    expect(s.lowScoreCalls).toBe(1);
  });
});

describe('summarize', () => {
  it('pools per call instead of averaging agent averages', () => {
    const current = [
      ev('1', 'a', 9, T),
      ev('2', 'a', 9, T),
      ev('3', 'a', 9, T),
      ev('4', 'b', 5, T),
    ];
    expect(summarize(current, [version(1)]).averageHundredths).toBe(800); // not (9 + 5) / 2
  });

  it('excludes insufficient-evidence evaluations from averages, low counts and criterion points', () => {
    const current = [ev('1', 'a', 8, T), ev('2', 'a', 4, T), ev('3', 'a', null, T)];
    const s = summarize(current, [version(1)]);
    expect(s).toMatchObject({
      scoredCalls: 2,
      insufficientCalls: 1,
      averageHundredths: 600,
      lowScoreCalls: 1,
    });
    expect(s.criteria[0]).toMatchObject({
      awardedPoints: 12,
      possiblePoints: 20,
      normalized: 6,
      scoredCount: 2,
    });
  });

  it('counts low scores strictly below the threshold of the evaluating version', () => {
    const current = [ev('1', 'a', 7, T, 1), ev('2', 'a', 6, T, 1), ev('3', 'a', 7, T, 2)];
    const s = summarize(current, [version(1, 7), version(2, 8)]);
    expect(s).toMatchObject({
      lowScoreCalls: 2,
      threshold: 8,
      mixedThresholds: true,
      scorecardVersions: [1, 2],
    });
  });

  it("can be restricted to one scorecard version with that version's threshold", () => {
    const current = [ev('1', 'a', 7, T, 1), ev('2', 'a', 7, T, 2)];
    const versions = [version(1, 7), version(2, 8)];
    expect(summarize(filterByVersion(current, 1), versions, 1)).toMatchObject({
      scoredCalls: 1,
      lowScoreCalls: 0,
      threshold: 7,
    });
    expect(summarize(filterByVersion(current, 2), versions, 2)).toMatchObject({
      lowScoreCalls: 1,
      threshold: 8,
    });
  });

  it('handles no data', () => {
    expect(summarize([], [version(1)])).toMatchObject({
      scoredCalls: 0,
      averageHundredths: null,
      lowScoreCalls: 0,
    });
  });
});
