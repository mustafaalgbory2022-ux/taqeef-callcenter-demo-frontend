import { describe, expect, it } from 'vitest';
import type { Agent, Evaluation, ScorecardVersion } from '@/shared/types/domain';
import { currentEvaluations, filterByVersion, summarize, summarizeByAgent } from './aggregate';

const version = (v: number, threshold = 7): ScorecardVersion => ({
  scorecardId: 'sc',
  version: v,
  name: { en: '', ar: '' },
  lowScoreThreshold: threshold,
  criteria: [
    { id: 'c1', label: { en: 'C1', ar: 'C1' }, description: { en: '', ar: '' }, weight: 1 },
  ],
  prohibitedExpressions: [],
  createdAt: '',
  createdBy: '',
  changeNote: '',
});

let seq = 0;
const ev = (
  callId: string,
  agentId: string,
  score: number | null,
  createdAt: string,
  v = 1,
): Evaluation => ({
  id: `e${++seq}`,
  callId,
  agentId,
  scorecardId: 'sc',
  scorecardVersion: v,
  status: 'completed',
  overallScore: score,
  criteria: [
    score === null
      ? {
          criterionId: 'c1',
          result: 'insufficient_evidence',
          score: null,
          rationale: '',
          evidence: [],
        }
      : {
          criterionId: 'c1',
          result: 'scored',
          score: Math.round(score),
          rationale: '',
          evidence: [],
        },
  ],
  prohibitedHits: [],
  trigger: 'initial',
  supersedesId: null,
  createdAt,
  simulated: true,
});

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

describe('currentEvaluations', () => {
  it('keeps only the latest eligible evaluation per call', () => {
    const old = ev('call1', 'a', 5, '2026-10-01T00:00:00Z');
    const rescore = ev('call1', 'a', 8, '2026-10-02T00:00:00Z');
    const ineligible = ev('call1', 'a', null, '2026-10-03T00:00:00Z');
    expect(currentEvaluations([old, rescore, ineligible])).toEqual([rescore]);
  });
});

describe('summarize', () => {
  it('pools per call instead of averaging agent averages', () => {
    // Agent A: 3 calls at 9 → avg 9. Agent B: 1 call at 5 → avg 5.
    const current = [
      ev('1', 'a', 9, '2026-10-01T00:00:00Z'),
      ev('2', 'a', 9, '2026-10-01T00:00:00Z'),
      ev('3', 'a', 9, '2026-10-01T00:00:00Z'),
      ev('4', 'b', 5, '2026-10-01T00:00:00Z'),
    ];
    const summary = summarize(current, [version(1)]);
    expect(summary.averageScore).toBe(8); // (9+9+9+5)/4, not (9+5)/2 = 7
    expect(summary.evaluatedCalls).toBe(4);
  });

  it('counts low scores strictly below the threshold of the evaluating version', () => {
    const current = [
      ev('1', 'a', 7, '2026-10-01T00:00:00Z', 1),
      ev('2', 'a', 6.99, '2026-10-01T00:00:00Z', 1),
      ev('3', 'a', 7.5, '2026-10-01T00:00:00Z', 2),
    ];
    const summary = summarize(current, [version(1, 7), version(2, 8)]);
    expect(summary.lowScoreCalls).toBe(2);
    expect(summary.threshold).toBe(8);
    expect(summary.scorecardVersions).toEqual([1, 2]);
    expect(summary.mixedThresholds).toBe(true);
  });

  it("can be restricted to one scorecard version with that version's threshold", () => {
    const current = [
      ev('1', 'a', 7.5, '2026-10-01T00:00:00Z', 1),
      ev('2', 'a', 7.5, '2026-10-01T00:00:00Z', 2),
    ];
    const versions = [version(1, 7), version(2, 8)];
    const v1 = summarize(filterByVersion(current, 1), versions, 1);
    expect(v1).toMatchObject({
      evaluatedCalls: 1,
      lowScoreCalls: 0,
      threshold: 7,
      thresholdVersion: 1,
      mixedThresholds: false,
    });
    expect(summarize(filterByVersion(current, 2), versions, 2)).toMatchObject({
      lowScoreCalls: 1,
      threshold: 8,
    });
  });

  it('separates not-scored criteria from criterion averages', () => {
    const current = [
      ev('1', 'a', 8, '2026-10-01T00:00:00Z'),
      ev('2', 'a', null, '2026-10-01T00:00:00Z'),
    ];
    // The null-score evaluation is ineligible for overall but its criterion is still counted.
    const summary = summarize(current, [version(1)]);
    expect(summary.criteria[0]).toMatchObject({ average: 8, scoredCount: 1, insufficientCount: 1 });
  });

  it('handles no data', () => {
    expect(summarize([], [version(1)])).toMatchObject({
      evaluatedCalls: 0,
      averageScore: null,
      lowScoreCalls: 0,
    });
  });
});

describe('summarizeByAgent', () => {
  it('lists agents alphabetically, including agents with no evaluations', () => {
    const rows = summarizeByAgent(
      [ev('1', 'b', 9, '2026-10-01T00:00:00Z')],
      [agent('b', 'Zed'), agent('a', 'Amy')],
      [version(1)],
    );
    expect(rows.map((r) => [r.agent.displayName, r.summary.evaluatedCalls])).toEqual([
      ['Amy', 0],
      ['Zed', 1],
    ]);
  });
});
