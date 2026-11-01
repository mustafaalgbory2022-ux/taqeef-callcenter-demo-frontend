import { describe, expect, it } from 'vitest';
import type { Evaluation } from '@/shared/types/domain';
import { compareEvaluations } from './compare';
import { currentEvaluations, historyByCall } from './current';

const ev = (
  id: string,
  createdAt: string,
  overall: number | null,
  scores: Record<string, number | null>,
  version = 1,
): Evaluation => ({
  id,
  callId: 'call',
  agentId: 'a',
  scorecardId: 'sc',
  scorecardVersion: version,
  status: 'completed',
  overallScore: overall,
  criteria: Object.entries(scores).map(([criterionId, score]) => ({
    criterionId,
    result: score === null ? 'not_assessable' : 'scored',
    score,
    rationale: '',
    evidence: [],
  })),
  prohibitedHits: [],
  trigger: 'initial',
  supersedesId: null,
  createdAt,
  simulated: true,
});

describe('currentEvaluations / historyByCall', () => {
  const first = ev('e1', '2026-10-01T00:00:00Z', 6, { a: 6 });
  const second = ev('e2', '2026-10-02T00:00:00Z', 8, { a: 8 });
  it('uses the latest eligible evaluation and keeps full history', () => {
    expect(currentEvaluations([second, first])).toEqual([second]);
    expect(
      historyByCall([first, second])
        .get('call')
        ?.map((e) => e.id),
    ).toEqual(['e2', 'e1']);
  });
});

describe('compareEvaluations', () => {
  it('reports per-criterion and overall deltas, including added criteria', () => {
    const before = ev('e1', '2026-10-01T00:00:00Z', 6, { a: 6, b: null });
    const after = ev('e2', '2026-10-02T00:00:00Z', 7.5, { a: 8, b: 7, c: 9 }, 2);
    const result = compareEvaluations(before, after, []);
    expect(result.overallDelta).toBe(1.5);
    expect(result.versionChanged).toBe(true);
    expect(result.criteria.map((c) => [c.criterionId, c.delta])).toEqual([
      ['a', 2],
      ['b', null],
      ['c', null],
    ]);
    expect(result.criteria.find((c) => c.criterionId === 'c')?.before).toBeNull();
  });
});
