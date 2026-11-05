import { isValidAward, scoreEvaluation } from '@/shared/utils/score';
import { scorecardVersions } from './fixtures/scorecards';
import type {
  Judgment,
  WireCall,
  WireEvaluation,
  WireReasonCode,
  WireScorecard,
  WireSegment,
} from './types';

export interface SimulateInput {
  id: string;
  call: Pick<WireCall, 'id' | 'agent_id' | 'channel_layout'>;
  segments: readonly WireSegment[];
  transcriptRevisionId: string;
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
  const segmentIds = new Set(input.segments.map((seg) => seg.segment_id));
  const judgmentById = new Map(input.judgments.map((jd) => [jd.criterionId, jd]));
  const rule = scorecard.prohibited_penalty;
  const ruleActive = rule.points > 0 && rule.criterion_id !== null;

  // 1. Criteria from judgments, re-mapped to the active version's points.
  const criteria: WireCriterion[] = scorecard.criteria.map((criterion) => {
    const jd = judgmentById.get(criterion.id);
    // Evidence references segments of the evaluated revision only.
    const evidence = (jd?.segmentIds ?? [])
      .filter((sid) => segmentIds.has(sid))
      .map((sid) => ({ segment_id: sid }));
    if (!jd || jd.result !== 'scored' || jd.awardedPoints === null) {
      const reason: WireReasonCode = !jd
        ? 'no_evidence'
        : jd.result === 'insufficient_evidence'
          ? 'ai_declared'
          : (jd.reasonCode ?? 'ai_declared');
      return {
        criterion_id: criterion.id,
        result: 'not_assessable',
        reason_code: reason,
        na_reason:
          reason !== 'ai_declared'
            ? null
            : jd?.result === 'insufficient_evidence'
              ? 'insufficient_evidence'
              : 'not_applicable',
        awarded_points: null,
        possible_points: criterion.max_points,
        penalty_points: 0,
        rationale: jd?.rationale ?? 'Simulated: no synthetic judgment exists for this criterion.',
        evidence,
      };
    }
    return {
      criterion_id: criterion.id,
      // Final met / partially met / not met is set after any penalty (below).
      result: 'met',
      reason_code: null,
      na_reason: null,
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
  let capacity = target?.awarded_points ?? 0;
  const hits: WireHit[] = scorecard.prohibited_expressions.flatMap((px) =>
    input.segments
      .filter((seg) => seg.text.toLowerCase().includes(px.phrase.toLowerCase()))
      .map((seg) => {
        const deduct = ruleActive && reliablyAgent(call, seg) ? Math.min(rule.points, capacity) : 0;
        capacity -= deduct;
        return {
          expression_id: px.id,
          phrase: px.phrase,
          segment_id: seg.segment_id,
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
  for (const c of criteria) {
    if (c.awarded_points === null) continue;
    c.result =
      c.awarded_points >= c.possible_points
        ? 'met'
        : c.awarded_points === 0
          ? 'not_met'
          : 'partially_met';
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
      reasonCode: c.reason_code,
      aiDeclaredReason: c.na_reason,
      awardedPoints: c.awarded_points,
      possiblePoints: c.possible_points,
      penaltyPoints: c.penalty_points,
      rationale: '',
      evidence: [],
    })),
    scorecard.minimum_assessable_points,
  );

  const displayHundredths =
    score.outcome === 'scored' && score.assessablePoints > 0
      ? Math.floor((1000 * score.awardedPoints) / score.assessablePoints)
      : null;
  const thresholdHundredths = Math.round(scorecard.low_score_threshold * 100);

  return {
    id: input.id,
    call_id: call.id,
    agent_id: call.agent_id,
    scorecard_id: scorecard.scorecard_id,
    scorecard_version: scorecard.version,
    transcript_revision_id: input.transcriptRevisionId,
    outcome: score.outcome,
    awarded_points: score.awardedPoints,
    assessable_points: score.assessablePoints,
    possible_points: score.possiblePoints,
    minimum_assessable_points: scorecard.minimum_assessable_points,
    // SIMULATED backend values (contract v0.1 3.4 / 3.7): integer division as in the M2 CHECK
    // display_hundredths = (1000·A)/P, and the low flag fixed with this run's threshold.
    display_hundredths: displayHundredths,
    below_threshold: displayHundredths === null ? null : displayHundredths < thresholdHundredths,
    threshold_hundredths: thresholdHundredths,
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
 * describing agent behaviour can be attributed, so every criterion is not assessable
 * (roles unreliable) and the evaluation has no score — whatever minimum the scorecard sets.
 */
export function syntheticUploadJudgments(scorecard: WireScorecard): Judgment[] {
  return scorecard.criteria.map((c) => ({
    criterionId: c.id,
    result: 'not_assessable',
    reasonCode: 'roles_unreliable',
    awardedPoints: null,
    rationale:
      'Mixed channel: speaker attribution unresolved, so agent behaviour cannot be attributed.',
    segmentIds: [],
  }));
}
