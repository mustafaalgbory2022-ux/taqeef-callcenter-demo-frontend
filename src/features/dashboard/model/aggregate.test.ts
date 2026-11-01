import { describe, expect, it } from 'vitest';
import type {
  Agent,
  CriterionEvaluation,
  Evaluation,
  ScorecardVersion,
} from '@/shared/types/domain';
import { currentEvaluations, filterByVersion, summarize, summarizeByAgent } from './aggregate';

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
          result: 'insufficient_evidence',
          awardedPoints: null,
          possiblePoints: 10,
          penaltyPoints: 0,
          rationale: '',
          evidence: [],
        }
      : {
          criterionId: 'c1',
          result: 'scored',
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
    status: 'completed',
    outcome: score === null ? 'insufficient_evidence' : 'scored',
    awardedPoints: score ?? 0,
    assessablePoints: score === null ? 0 : 10,
    possiblePoints: 10,
    minimumAssessablePoints: 6,
    overallScore: score,
    criteria: [criterion],
    prohibitedHits: [],
    trigger: 'initial',
    supersedesId: null,
    createdAt,
    simulated: true,
  };
};

const agent = (id: string, displayName: string): Agent => ({
  id,
  displayName,
  extension: id,
  status: 'active',
  queueIds: [],
  synthetic: true,
  createdAt: '',
  updatedAt: '',
});

const T = '2026-10-01T00:00:00Z';

describe('currentEvaluations', () => {
  it('uses the latest completed evaluation, ignoring failed attempts', () => {
    const old = ev('call1', 'a', 5, T);
    const rescore = ev('call1', 'a', 8, '2026-10-02T00:00:00Z');
    const failed = { ...ev('call1', 'a', 9, '2026-10-03T00:00:00Z'), status: 'failed' as const };
    expect(currentEvaluations([old, rescore, failed])).toEqual([rescore]);
  });

  it('never falls back to an older score when the latest is insufficient evidence', () => {
    const old = ev('call1', 'a', 8, T);
    const insufficient = ev('call1', 'a', null, '2026-10-02T00:00:00Z');
    expect(currentEvaluations([old, insufficient])).toEqual([insufficient]);
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
    expect(summarize(current, [version(1)]).averageScore).toBe(8); // not (9 + 5) / 2 = 7
  });

  it('excludes insufficient-evidence evaluations from averages, low counts and criterion points', () => {
    const current = [ev('1', 'a', 8, T), ev('2', 'a', 4, T), ev('3', 'a', null, T)];
    const s = summarize(current, [version(1)]);
    expect(s).toMatchObject({
      scoredCalls: 2,
      insufficientCalls: 1,
      averageScore: 6,
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
      averageScore: null,
      lowScoreCalls: 0,
    });
  });
});

describe('summarizeByAgent', () => {
  it('lists agents alphabetically, including agents with no scored calls', () => {
    const rows = summarizeByAgent(
      [ev('1', 'b', 9, T), ev('2', 'a', null, T)],
      [agent('b', 'Zed'), agent('a', 'Amy')],
      [version(1)],
    );
    expect(
      rows.map((r) => [r.agent.displayName, r.summary.scoredCalls, r.summary.insufficientCalls]),
    ).toEqual([
      ['Amy', 0, 1],
      ['Zed', 1, 0],
    ]);
  });
});
