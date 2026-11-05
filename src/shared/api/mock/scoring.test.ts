import { describe, expect, it } from 'vitest';
import { scorecardVersions } from './fixtures/scorecards';
import { remapAward, simulateEvaluation, syntheticUploadJudgments } from './scoring';
import type { Judgment, WireScorecard, WireSegment } from './types';

const REV = '0193a000-0000-7000-8000-000000000001';
const base = scorecardVersions[0] as WireScorecard;
const withPenalty: WireScorecard = {
  ...base,
  prohibited_penalty: { points: 1, criterion_id: 'c-language' },
};

const segments: WireSegment[] = [
  {
    segment_id: 'seg-0001',
    start_ms: 0,
    end_ms: 1000,
    speaker: 'agent',
    language: 'ar',
    text: 'هذا مو شغلي',
  },
];
const judgments: Judgment[] = base.criteria.map((c) => ({
  criterionId: c.id,
  result: 'scored',
  awardedPoints: c.max_points,
  rationale: '',
  segmentIds: [],
}));

const run = (
  scorecard: WireScorecard,
  opts: { layout?: 'dual' | 'mixed'; speaker?: WireSegment['speaker'] } = {},
) =>
  simulateEvaluation({
    id: 'e',
    call: { id: 'c', agent_id: 'a', channel_layout: opts.layout ?? 'dual' },
    transcriptRevisionId: REV,
    segments: segments.map((s) => ({ ...s, speaker: opts.speaker ?? s.speaker })),
    judgments,
    scorecard,
    trigger: 'initial',
    supersedesId: null,
    createdAt: '2026-10-01T00:00:00Z',
  });

describe('simulated scoring — prohibited expressions', () => {
  it('only flags for review when no penalty rule is active', () => {
    const e = run(base);
    expect(e.prohibited_hits[0]).toMatchObject({
      disposition: 'flagged_for_review',
      penalty_points: 0,
    });
    expect(e.display_hundredths).toBe(1000);
    expect(e.below_threshold).toBe(false);
  });

  it('applies the active penalty rule to reliably attributed agent speech', () => {
    const e = run(withPenalty);
    expect(e.prohibited_hits[0]).toMatchObject({
      disposition: 'penalty_applied',
      penalty_points: 1,
      speaker: 'agent',
    });
    expect(e.criteria.find((c) => c.criterion_id === 'c-language')).toMatchObject({
      units_awarded: 1,
      penalty_points: 1,
    });
    expect(e).toMatchObject({
      points_awarded_sum: 9,
      points_possible_sum: 10,
      unit: 1,
      display_hundredths: 900,
    });
  });

  it('never penalises customer speech or unknown speakers on a mixed channel', () => {
    expect(run(withPenalty, { speaker: 'customer' }).prohibited_hits[0]?.disposition).toBe(
      'flagged_for_review',
    );
    expect(
      run(withPenalty, { layout: 'mixed', speaker: 'unknown' }).prohibited_hits[0]?.disposition,
    ).toBe('flagged_for_review');
    expect(run(withPenalty, { layout: 'mixed', speaker: 'agent' }).display_hundredths).toBe(1000);
  });
});

describe('simulated scoring — minimum assessable points', () => {
  it('marks mixed-channel uploads not assessable (roles unreliable), never scored', () => {
    const e = simulateEvaluation({
      id: 'e',
      call: { id: 'u', agent_id: 'a', channel_layout: 'mixed' },
      transcriptRevisionId: REV,
      segments: [],
      judgments: syntheticUploadJudgments(base),
      scorecard: base,
      trigger: 'initial',
      supersedesId: null,
      createdAt: '2026-10-01T00:00:00Z',
    });
    expect(e).toMatchObject({
      outcome: 'not_assessable',
      points_possible_sum: 0,
      display_hundredths: null,
      below_threshold: null,
      transcript_revision_id: REV,
    });
    expect(e.criteria.every((c) => c.reason_code === 'roles_unreliable')).toBe(true);
  });
});

describe('simulated scoring — penalty accounting', () => {
  const twoHits: WireSegment[] = [
    {
      segment_id: 'seg-0001',
      start_ms: 0,
      end_ms: 1000,
      speaker: 'agent',
      language: 'ar',
      text: 'مو شغلي',
    },
    {
      segment_id: 'seg-0002',
      start_ms: 2000,
      end_ms: 3000,
      speaker: 'agent',
      language: 'ar',
      text: 'هم مو شغلي',
    },
  ];
  const evaluate = (language: Judgment) =>
    simulateEvaluation({
      id: 'e',
      call: { id: 'c', agent_id: 'a', channel_layout: 'dual' },
      transcriptRevisionId: REV,
      segments: twoHits,
      judgments: judgments.map((j) => (j.criterionId === 'c-language' ? language : j)),
      scorecard: withPenalty,
      trigger: 'initial',
      supersedesId: null,
      createdAt: '2026-10-01T00:00:00Z',
    });

  it('never reports more penalty than was actually deducted', () => {
    const e = evaluate({
      criterionId: 'c-language',
      result: 'scored',
      awardedPoints: 1,
      rationale: '',
      segmentIds: [],
    });
    expect(e.prohibited_hits.map((h) => [h.disposition, h.penalty_points])).toEqual([
      ['penalty_applied', 1],
      ['flagged_for_review', 0],
    ]);
    expect(e.criteria.find((c) => c.criterion_id === 'c-language')).toMatchObject({
      units_awarded: 0,
      penalty_points: 1,
    });
  });

  it('flags hits for review when the penalty target could not be scored', () => {
    const e = evaluate({
      criterionId: 'c-language',
      result: 'insufficient_evidence',
      awardedPoints: null,
      rationale: '',
      segmentIds: [],
    });
    expect(
      e.prohibited_hits.every(
        (h) => h.disposition === 'flagged_for_review' && h.penalty_points === 0,
      ),
    ).toBe(true);
  });
});

describe('simulated scoring — configurable points and partial credit', () => {
  it('re-maps judgments to the active points and snaps all-or-nothing criteria', () => {
    expect(remapAward(1, 2, { max_points: 2, allow_partial_credit: false })).toBe(0);
    expect(remapAward(2, 2, { max_points: 2, allow_partial_credit: false })).toBe(2);
    expect(remapAward(3, 3, { max_points: 2, allow_partial_credit: true })).toBe(2);
    expect(remapAward(2, 3, { max_points: 2, allow_partial_credit: true })).toBe(1); // 1.33 → 1
    expect(remapAward(1, 2, { max_points: 3, allow_partial_credit: true })).toBe(2); // 1.5 → 2
  });

  it('applies a version that turns partial credit off', () => {
    const allOrNothing: WireScorecard = {
      ...base,
      criteria: base.criteria.map((c) =>
        c.id === 'c-needs' ? { ...c, allow_partial_credit: false } : c,
      ),
    };
    const e = simulateEvaluation({
      id: 'e',
      call: { id: 'c', agent_id: 'a', channel_layout: 'dual' },
      transcriptRevisionId: REV,
      segments: [],
      judgments: [
        {
          criterionId: 'c-needs',
          result: 'scored',
          awardedPoints: 1,
          rationale: '',
          segmentIds: [],
        },
      ],
      scorecard: allOrNothing,
      trigger: 'initial',
      supersedesId: null,
      createdAt: '2026-10-01T00:00:00Z',
    });
    expect(e.criteria.find((c) => c.criterion_id === 'c-needs')).toMatchObject({
      units_awarded: 0,
      units_possible: 2,
    });
  });
});
