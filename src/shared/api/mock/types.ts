import type { Decoded } from '../decode';
import type { WireAiConfig, WireAiJob, WireAiModel } from './fixtures/ai';
import type {
  WireCorrection,
  WireDictionaryEntry,
  WireDictionaryVersion,
} from './fixtures/dictionary';
import type { wireAdminAudit } from '../wire/admin';
import type { wireAgent, wireAuditEntry, wireQueue } from '../wire/agents';
import type { wireCall, wireTranscript } from '../wire/calls';
import type { WireEvaluation } from '../wire/evaluations';
import type { wireReport } from '../wire/operations';
import type { wireScorecardVersion } from '../wire/scorecards';

export type WireQueue = Decoded<typeof wireQueue>;
export type WireAgent = Decoded<typeof wireAgent>;
export type WireAudit = Decoded<typeof wireAuditEntry>;
export type WireCall = Decoded<typeof wireCall>;
export type WireTranscript = Decoded<typeof wireTranscript>;
export type WireSegment = WireTranscript['segments'][number];
export type WireScorecard = Decoded<typeof wireScorecardVersion>;
export type WireReport = Decoded<typeof wireReport>;
export type WireAdminAudit = Decoded<typeof wireAdminAudit>;
export type { WireEvaluation };

/** Simulated model output for one criterion of one call (synthetic). */
export interface Judgment {
  criterionId: string;
  result: 'scored' | 'not_assessable' | 'insufficient_evidence';
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
  /** Review status per call id (persisted separately so generated calls keep reviews). */
  reviews: Record<string, WireCall['review']>;
  reports: WireReport[];
  /** Upload time (epoch ms) per uploaded call, used to simulate processing stages. */
  uploads: Record<string, number>;
  /** Append-only administration audit log (newest first). */
  adminAudit: WireAdminAudit[];
  ai: {
    models: WireAiModel[];
    configs: WireAiConfig[];
    jobs: WireAiJob[];
    paused: boolean;
    /** Epoch ms when each service last switched model (drives the simulated "loading" state). */
    loadedAt: { transcription: number; evaluation: number };
  };
  dictionary: {
    entries: WireDictionaryEntry[];
    versions: Record<string, WireDictionaryVersion[]>;
    corrections: WireCorrection[];
  };
  seq: number;
}
