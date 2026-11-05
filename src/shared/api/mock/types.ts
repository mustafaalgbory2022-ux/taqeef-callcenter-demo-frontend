import type { Decoded } from '../decode';
import type { wireAgent, wireAuditEntry, wireQueue } from '../wire/agents';
import type { wireCall, wireTranscript } from '../wire/calls';
import type { WireEvaluation } from '../wire/evaluations';
import type { wireScorecardVersion } from '../wire/scorecards';

export type WireQueue = Decoded<typeof wireQueue>;
export type WireAgent = Decoded<typeof wireAgent>;
export type WireAudit = Decoded<typeof wireAuditEntry>;
export type WireCall = Decoded<typeof wireCall>;
export type WireTranscript = Decoded<typeof wireTranscript>;
export type WireSegment = WireTranscript['segments'][number];
export type WireScorecard = Decoded<typeof wireScorecardVersion>;
export type WireReasonCode = NonNullable<WireEvaluation['criteria'][number]['reason_code']>;
export type { WireEvaluation };

/** Simulated model output for one criterion of one call (synthetic). */
export interface Judgment {
  criterionId: string;
  /** Mock-internal: 'insufficient_evidence' = the AI declared too little evidence. */
  result: 'scored' | 'not_assessable' | 'insufficient_evidence';
  /** Reason code for not_assessable (defaults to ai_declared / not_applicable). */
  reasonCode?: WireReasonCode;
  /** Actual points before any prohibited-expression penalty. */
  awardedPoints: number | null;
  rationale: string;
  segmentIds: readonly string[];
}

export interface MockState {
  queues: WireQueue[];
  agents: WireAgent[];
  audit: Record<string, WireAudit[]>;
  calls: WireCall[];
  transcripts: Record<string, WireTranscript>;
  judgments: Record<string, Judgment[]>;
  scorecards: WireScorecard[];
  evaluations: WireEvaluation[];
  /** Upload time (epoch ms) per uploaded call, used to simulate processing stages. */
  uploads: Record<string, number>;
  seq: number;
}
