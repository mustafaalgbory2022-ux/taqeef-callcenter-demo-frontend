import { computeOverallScore } from '@/shared/utils/score';
import type { Judgment, WireEvaluation, WireScorecard, WireSegment } from './types';

export interface SimulateInput {
  id: string;
  callId: string;
  agentId: string | null;
  segments: readonly WireSegment[];
  judgments: readonly Judgment[];
  scorecard: WireScorecard;
  trigger: WireEvaluation['trigger'];
  supersedesId: string | null;
  createdAt: string;
}

/**
 * SIMULATED scoring (the real backend performs AI scoring). Applies stored synthetic
 * judgments to the given scorecard version: weights and criteria come from the version,
 * prohibited expressions are matched against the transcript text.
 */
export function simulateEvaluation(input: SimulateInput): WireEvaluation {
  const segmentById = new Map(input.segments.map((seg) => [seg.id, seg]));
  const judgmentById = new Map(input.judgments.map((jd) => [jd.criterionId, jd]));

  const criteria = input.scorecard.criteria.map((criterion) => {
    const jd = judgmentById.get(criterion.id);
    if (!jd) {
      return {
        criterion_id: criterion.id,
        result: 'insufficient_evidence' as const,
        score: null,
        rationale: 'Simulated: no synthetic judgment exists for this criterion.',
        evidence: [],
      };
    }
    return {
      criterion_id: criterion.id,
      result: jd.result,
      score: jd.result === 'scored' ? jd.score : null,
      rationale: jd.rationale,
      evidence: jd.segmentIds.flatMap((sid) => {
        const seg = segmentById.get(sid);
        return seg
          ? [{ segment_id: seg.id, start_ms: seg.start_ms, end_ms: seg.end_ms, quote: seg.text }]
          : [];
      }),
    };
  });

  const overall = computeOverallScore(
    input.scorecard.criteria,
    criteria.map((c) => ({
      criterionId: c.criterion_id,
      result: c.result,
      score: c.score,
      rationale: c.rationale,
      evidence: [],
    })),
  );

  const prohibitedHits = input.scorecard.prohibited_expressions.flatMap((px) =>
    input.segments
      .filter((seg) => seg.text.toLowerCase().includes(px.phrase.toLowerCase()))
      .map((seg) => ({
        expression_id: px.id,
        phrase: px.phrase,
        segment_id: seg.id,
        start_ms: seg.start_ms,
        quote: seg.text,
      })),
  );

  return {
    id: input.id,
    call_id: input.callId,
    agent_id: input.agentId,
    scorecard_id: input.scorecard.scorecard_id,
    scorecard_version: input.scorecard.version,
    status: 'completed',
    overall_score: overall,
    criteria,
    prohibited_hits: prohibitedHits,
    trigger: input.trigger,
    supersedes_id: input.supersedesId,
    created_at: input.createdAt,
    simulated: true,
  };
}

/** Deterministic pseudo-judgments for uploaded calls (whole points 5–9). */
export function syntheticJudgments(callId: string, criterionIds: readonly string[]): Judgment[] {
  return criterionIds.map((criterionId, i) => {
    let h = 7;
    for (const ch of `${callId}:${criterionId}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return {
      criterionId,
      result: 'scored',
      score: 5 + (h % 5),
      rationale: 'Simulated judgment for an uploaded synthetic file.',
      segmentIds: [`s${(i % 6) + 1}`],
    };
  });
}
