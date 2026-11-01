import type { Evaluation } from '@/shared/types/domain';
import {
  arrayOf,
  bool,
  DecodeError,
  nullable,
  num,
  numInRange,
  object,
  oneOf,
  str,
  type Decoded,
} from '../decode';

const score = numInRange(0, 10);
import { wireTimeToMs } from './common';

const wireEvidence = object({ segment_id: str, start_ms: num, end_ms: num, quote: str });

export const wireEvaluation = object({
  id: str,
  call_id: str,
  agent_id: nullable(str),
  scorecard_id: str,
  scorecard_version: num,
  status: oneOf(['completed', 'failed']),
  overall_score: nullable(score),
  criteria: arrayOf(
    object({
      criterion_id: str,
      result: oneOf(['scored', 'not_assessable', 'insufficient_evidence']),
      score: nullable(score),
      rationale: str,
      evidence: arrayOf(wireEvidence),
    }),
  ),
  prohibited_hits: arrayOf(
    object({ expression_id: str, phrase: str, segment_id: str, start_ms: num, quote: str }),
  ),
  trigger: oneOf(['initial', 'rescore']),
  supersedes_id: nullable(str),
  created_at: str,
  simulated: bool,
});

export type WireEvaluation = Decoded<typeof wireEvaluation>;

export function evaluationFromWire(w: WireEvaluation): Evaluation {
  w.criteria.forEach((c, i) => {
    if (c.result === 'scored' && c.score === null) {
      throw new DecodeError(`criteria[${i}].score`, 'a score when result is "scored"');
    }
  });
  return {
    id: w.id,
    callId: w.call_id,
    agentId: w.agent_id,
    scorecardId: w.scorecard_id,
    scorecardVersion: w.scorecard_version,
    status: w.status,
    overallScore: w.overall_score,
    criteria: w.criteria.map((c) => ({
      criterionId: c.criterion_id,
      result: c.result,
      score: c.result === 'scored' ? c.score : null,
      rationale: c.rationale,
      evidence: c.evidence.map((e) => ({
        segmentId: e.segment_id,
        startMs: wireTimeToMs(e.start_ms),
        endMs: wireTimeToMs(e.end_ms),
        quote: e.quote,
      })),
    })),
    prohibitedHits: w.prohibited_hits.map((h) => ({
      expressionId: h.expression_id,
      phrase: h.phrase,
      segmentId: h.segment_id,
      startMs: wireTimeToMs(h.start_ms),
      quote: h.quote,
    })),
    trigger: w.trigger,
    supersedesId: w.supersedes_id,
    createdAt: w.created_at,
    simulated: w.simulated,
  };
}
