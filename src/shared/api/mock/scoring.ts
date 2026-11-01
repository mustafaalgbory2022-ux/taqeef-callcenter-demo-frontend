import { isValidAward, scoreEvaluation } from '@/shared/utils/score';
import { scorecardVersions } from './fixtures/scorecards';
import type { Judgment, WireCall, WireEvaluation, WireScorecard, WireSegment } from './types';

export interface SimulateInput {
  id: string;
  call: Pick<WireCall, 'id' | 'agent_id' | 'channel_layout'>;
  segments: readonly WireSegment[];
  judgments: readonly Judgment[];
  scorecard: WireScorecard;
  trigger: WireEvaluation['trigger'];
  supersedesId: string | null;
  createdAt: string;
}

type WireHit = WireEvaluation['prohibited_hits'][number];

/** Points each synthetic judgment was written against (the approved default card). */
const JUDGED_OUT_OF = new Map(
  (scorecardVersions[0]?.criteria ?? []).map((c) => [c.id, c.max_points]),
);

/**
 * Re-map a judgment to the active version's points, deterministically: proportional with
 * partial credit (rounded half up), otherwise all-or-nothing (full marks only for a full
 * judgment). The result always satisfies isValidAward.
 */
export function remapAward(
  awarded: number,
  judgedOutOf: number,
  criterion: { max_points: number; allow_partial_credit: boolean },
): number {
  const ratio = judgedOutOf > 0 ? Math.min(1, Math.max(0, awarded / judgedOutOf)) : 0;
  const points = criterion.allow_partial_credit
    ? Math.round(ratio * criterion.max_points)
    : ratio === 1
      ? criterion.max_points
      : 0;
  if (
    !isValidAward(points, {
      maxPoints: criterion.max_points,
      allowPartialCredit: criterion.allow_partial_credit,
    })
  ) {
    throw new Error(`Invalid simulated award ${points} for ${criterion.max_points}`);
  }
  return points;
}
type WireCriterion = WireEvaluation['criteria'][number];

/** Agent attribution is reliable only on separated channels with an agent-labelled segment. */
function reliablyAgent(call: SimulateInput['call'], seg: WireSegment): boolean {
  return call.channel_layout === 'dual' && seg.speaker === 'agent';
}

/**
 * SIMULATED scoring (the real backend performs AI scoring). Deterministic: synthetic
 * judgments in actual points are applied to the given scorecard version.
 * - Criteria missing a judgment are "insufficient evidence".
 * - Prohibited expressions deduct points ONLY when the version defines a penalty rule and
 *   the hit is reliably attributed to the agent; otherwise they are flagged for review.
 * - The evaluation is scored only if assessable points ≥ the version's minimum.
 */
export function simulateEvaluation(input: SimulateInput): WireEvaluation {
  const { scorecard, call } = input;
  const segmentById = new Map(input.segments.map((seg) => [seg.id, seg]));
  const judgmentById = new Map(input.judgments.map((jd) => [jd.criterionId, jd]));
  const rule = scorecard.prohibited_penalty;
  const ruleActive = rule.points > 0 && rule.criterion_id !== null;

  // 1. Criteria from judgments, re-mapped to the active version's points.
  const criteria: WireCriterion[] = scorecard.criteria.map((criterion) => {
    const jd = judgmentById.get(criterion.id);
    const evidence = (jd?.segmentIds ?? []).flatMap((sid) => {
      const seg = segmentById.get(sid);
      return seg
        ? [{ segment_id: seg.id, start_ms: seg.start_ms, end_ms: seg.end_ms, quote: seg.text }]
        : [];
    });
    if (!jd || jd.result !== 'scored' || jd.awardedPoints === null) {
      return {
        criterion_id: criterion.id,
        result: jd?.result === 'not_assessable' ? 'not_assessable' : 'insufficient_evidence',
        awarded_points: null,
        possible_points: criterion.max_points,
        penalty_points: 0,
        rationale: jd?.rationale ?? 'Simulated: no synthetic judgment exists for this criterion.',
        evidence,
      };
    }
    return {
      criterion_id: criterion.id,
      result: 'scored',
      awarded_points: remapAward(
        jd.awardedPoints,
        JUDGED_OUT_OF.get(criterion.id) ?? criterion.max_points,
        criterion,
      ),
      possible_points: criterion.max_points,
      penalty_points: 0,
      rationale: jd.rationale,
      evidence,
    };
  });

  // 2. Prohibited expressions. A hit deducts only if the rule is active, the speaker is
  //    reliably the agent, and the target criterion was scored and still has points left
  //    (the rule may only target partial-credit criteria). Otherwise: flag for review.
  const target = ruleActive
    ? criteria.find((c) => c.criterion_id === rule.criterion_id)
    : undefined;
  let capacity =
    target?.result === 'scored' && target.awarded_points !== null ? target.awarded_points : 0;
  const hits: WireHit[] = scorecard.prohibited_expressions.flatMap((px) =>
    input.segments
      .filter((seg) => seg.text.toLowerCase().includes(px.phrase.toLowerCase()))
      .map((seg) => {
        const deduct = ruleActive && reliablyAgent(call, seg) ? Math.min(rule.points, capacity) : 0;
        capacity -= deduct;
        return {
          expression_id: px.id,
          phrase: px.phrase,
          segment_id: seg.id,
          start_ms: seg.start_ms,
          quote: seg.text,
          speaker: seg.speaker,
          disposition: deduct > 0 ? ('penalty_applied' as const) : ('flagged_for_review' as const),
          penalty_points: deduct,
        };
      }),
  );
  const deducted = hits.reduce((sum, h) => sum + h.penalty_points, 0);
  if (target && deducted > 0 && target.awarded_points !== null) {
    target.awarded_points -= deducted;
    target.penalty_points = deducted;
  }

  const score = scoreEvaluation(
    scorecard.criteria.map((c) => ({
      ...c,
      maxPoints: c.max_points,
      allowPartialCredit: c.allow_partial_credit,
    })),
    criteria.map((c) => ({
      criterionId: c.criterion_id,
      result: c.result,
      awardedPoints: c.awarded_points,
      possiblePoints: c.possible_points,
      penaltyPoints: c.penalty_points,
      rationale: '',
      evidence: [],
    })),
    scorecard.minimum_assessable_points,
  );

  return {
    id: input.id,
    call_id: call.id,
    agent_id: call.agent_id,
    scorecard_id: scorecard.scorecard_id,
    scorecard_version: scorecard.version,
    status: 'completed',
    outcome: score.outcome,
    awarded_points: score.awardedPoints,
    assessable_points: score.assessablePoints,
    possible_points: score.possiblePoints,
    minimum_assessable_points: scorecard.minimum_assessable_points,
    overall_score: score.overallScore,
    criteria,
    prohibited_hits: hits,
    trigger: input.trigger,
    supersedes_id: input.supersedesId,
    created_at: input.createdAt,
    simulated: true,
  };
}

/**
 * Judgments for uploaded (mixed-channel) files: with speakers unresolved, no criterion
 * describing agent behaviour can be attributed, so every criterion is insufficient
 * evidence and the evaluation has no score — whatever minimum the scorecard sets.
 */
export function syntheticUploadJudgments(scorecard: WireScorecard): Judgment[] {
  return scorecard.criteria.map((c) => ({
    criterionId: c.id,
    result: 'insufficient_evidence',
    awardedPoints: null,
    rationale:
      'Mixed channel: speaker attribution unresolved, so agent behaviour cannot be attributed.',
    segmentIds: [],
  }));
}
