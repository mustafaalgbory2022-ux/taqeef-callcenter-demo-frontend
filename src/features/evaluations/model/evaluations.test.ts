import { describe, expect, it } from 'vitest';
import type { Evaluation } from '@/shared/types/domain';
import { compareEvaluations } from './compare';
import { currentEvaluations, historyByCall } from './current';

const ev = (
  id: string,
  createdAt: string,
  overall: number | null,
  points: Record<string, number | null>,
  version = 1,
): Evaluation => ({
  id,
  callId: 'call',
  agentId: 'a',
  scorecardId: 'sc',
  scorecardVersion: version,
  transcriptRevisionId: '0193a000-0000-7000-8000-000000000001',
  outcome: overall === null ? 'insufficient_evidence' : 'scored',
  awardedPoints: 0,
  assessablePoints: 0,
  possiblePoints: 10,
  minimumAssessablePoints: 6,
  displayHundredths: overall === null ? null : Math.round(overall * 100),
  belowThreshold: overall === null ? null : overall < 7,
  thresholdHundredths: 700,
  criteria: Object.entries(points).map(([criterionId, awardedPoints]) => ({
    criterionId,
    result: awardedPoints === null ? 'not_assessable' : 'partially_met',
    reasonCode: awardedPoints === null ? 'no_evidence' : null,
    aiDeclaredReason: null,
    awardedPoints,
    possiblePoints: 3,
    penaltyPoints: 0,
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
  const first = ev('e1', '2026-10-01T00:00:00Z', 6, { a: 2 });
  const second = ev('e2', '2026-10-02T00:00:00Z', 8, { a: 3 });
  it('uses the latest completed evaluation and keeps full history', () => {
    expect(currentEvaluations([second, first])).toEqual([second]);
    expect(
      historyByCall([first, second])
        .get('call')
        ?.map((e) => e.id),
    ).toEqual(['e2', 'e1']);
  });
});

describe('compareEvaluations', () => {
  it('reports actual-point deltas per criterion and the overall score change', () => {
    const before = ev('e1', '2026-10-01T00:00:00Z', 6, { a: 1, b: null });
    const after = ev('e2', '2026-10-02T00:00:00Z', 7.5, { a: 3, b: 2, c: 1 }, 2);
    const result = compareEvaluations(before, after, []);
    expect(result.overallDelta).toBe(150); // display_hundredths difference
    expect(result.versionChanged).toBe(true);
    expect(result.criteria.map((c) => [c.criterionId, c.pointsDelta])).toEqual([
      ['a', 2],
      ['b', null],
      ['c', null],
    ]);
  });

  it('does not compare points when a criterion maximum changed', () => {
    const before = ev('e1', '2026-10-01T00:00:00Z', 6, { a: 2 });
    const after = ev('e2', '2026-10-02T00:00:00Z', 6, { a: 2 });
    const changed = {
      ...after,
      criteria: after.criteria.map((c) => ({ ...c, possiblePoints: 4 })),
    };
    expect(compareEvaluations(before, changed, []).criteria[0]?.pointsDelta).toBeNull();
  });

  it('has no overall delta when one side has no score', () => {
    const before = ev('e1', '2026-10-01T00:00:00Z', null, { a: 1 });
    const after = ev('e2', '2026-10-02T00:00:00Z', 8, { a: 3 });
    expect(compareEvaluations(before, after, []).overallDelta).toBeNull();
  });
});
