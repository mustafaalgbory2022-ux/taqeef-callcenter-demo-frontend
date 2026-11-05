/**
 * Domain types used throughout the UI (camelCase).
 * Wire formats (snake_case) live in shared/api/wire and are mapped to these types.
 */

export type Language = 'ar' | 'en';

export interface LocalizedText {
  ar: string;
  en: string;
}

export type Permission =
  | 'agents.manage'
  | 'scorecards.manage'
  | 'calls.upload'
  | 'evaluations.rescore'
  | 'settings.manage';

/**
 * A local demo session opened by exchanging a one-time launch code. The CSRF token from the
 * exchange is held by the ApiClient in memory only and is never part of this object.
 */
export interface Session {
  mode: 'mock' | 'live';
  permissions: readonly Permission[];
  /** Null when the server did not report it (e.g. on session resume). */
  idleTimeoutS: number | null;
  absoluteTimeoutS: number | null;
}

/** Agents are created, then retired; never deleted or reactivated (contract v0.2.1 §A). */
export type AgentStatus = 'active' | 'retired';

export interface Agent {
  /** Stable internal id. Opaque: conventions are not yet confirmed by the backend. */
  id: string;
  displayName: string;
  /** PROVISIONAL extra label (not in contract v0.2.1); null when the server sends none. */
  extension: string | null;
  status: AgentStatus;
  synthetic: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Create-only input: names are immutable (no rename route). */
export interface AgentInput {
  displayName: string;
  extension: string;
}

export interface AuditChange {
  field: string;
  before: string | null;
  after: string | null;
}

export interface AuditEntry {
  id: string;
  action: 'created' | 'retired';
  actor: string;
  at: string;
  changes: readonly AuditChange[];
}

/** Call status (demo API contract v0.2 item C, CONFIRMED). */
export const CALL_STATUSES = [
  'uploaded',
  'probing',
  'ready',
  'transcribing',
  'transcribed',
  'evaluating',
  'scored',
  'insufficient_evidence',
  'not_assessable',
  'rejected',
  'transcription_failed',
  'evaluation_failed',
] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

/** Processing job state (contract v0.2 item E2, CONFIRMED). */
export const JOB_STATES = [
  'queued',
  'running',
  'succeeded',
  'retry_scheduled',
  'failed',
  'waiting',
  'cancelled',
] as const;
export type JobState = (typeof JOB_STATES)[number];

export interface Call {
  id: string;
  title: string;
  agentId: string | null;
  /** PROPOSED (contract v0.2.1 §A): returned with call list and detail. */
  agentDisplayName: string | null;
  language: Language | 'mixed';
  durationMs: number | null;
  recordedAt: string;
  status: CallStatus;
  /** Current transcript revision; null until transcription has produced one. */
  currentTranscriptRevisionId: string | null;
  synthetic: boolean;
  /** True when processing was simulated by the mock backend. */
  simulated: boolean;
  source: 'fixture' | 'upload';
  /**
   * 'dual' = agent and customer on separate channels (speaker attribution reliable);
   * 'mixed' = single mixed channel: speakers stay unresolved unless evidence supports them.
   */
  channelLayout: 'dual' | 'mixed';
}

/** Channel map for an upload; null = the server's global default. */
export type ChannelMap = 'left_agent' | 'right_agent' | 'none';

export interface CallUpload {
  file: File;
  displayName: string;
  agentId: string;
  channelMap: ChannelMap | null;
}

export interface UploadAccepted {
  callId: string;
  jobId: string;
}

/** 'unknown' until speaker attribution is supported by evidence (e.g. mixed channel). */
export type Speaker = 'agent' | 'customer' | 'unknown';

export interface TranscriptSegment {
  id: string;
  startMs: number;
  endMs: number;
  speaker: Speaker;
  language: Language;
  text: string;
}

/** One immutable transcript revision. Segment ids are unique within a revision only. */
export interface Transcript {
  callId: string;
  revisionId: string;
  revisionNo: number;
  segments: readonly TranscriptSegment[];
}

export interface Criterion {
  id: string;
  label: LocalizedText;
  description: LocalizedText;
  /** Points available for this criterion (the approved default card totals 10). */
  maxPoints: number;
  /** Whether any whole number of points between 0 and maxPoints may be awarded. */
  allowPartialCredit: boolean;
}

/**
 * Prohibited expressions only affect scores when the active scorecard defines a penalty
 * (points > 0) AND the expression is reliably attributed to the agent. Otherwise every hit
 * is flagged for review.
 */
export interface ProhibitedPenaltyRule {
  points: number;
  criterionId: string | null;
}

export interface ProhibitedExpression {
  id: string;
  phrase: string;
  language: Language;
}

export interface ScorecardVersion {
  scorecardId: string;
  version: number;
  name: LocalizedText;
  /** A call is low-scoring when its overall score is strictly below this value. */
  lowScoreThreshold: number;
  /** Minimum assessable points for the evaluation to receive a score (approved: 6 of 10). */
  minimumAssessablePoints: number;
  criteria: readonly Criterion[];
  prohibitedExpressions: readonly ProhibitedExpression[];
  prohibitedPenalty: ProhibitedPenaltyRule;
  createdAt: string;
  createdBy: string;
  changeNote: string;
}

export type ScorecardDraft = Pick<
  ScorecardVersion,
  | 'name'
  | 'lowScoreThreshold'
  | 'minimumAssessablePoints'
  | 'criteria'
  | 'prohibitedExpressions'
  | 'prohibitedPenalty'
  | 'changeNote'
>;

export type CriterionResultKind = 'met' | 'partially_met' | 'not_met' | 'not_assessable';

/** Why a criterion was not assessable (set exactly when the result is not_assessable). */
export type NotAssessableReason =
  | 'roles_unreliable'
  | 'no_transcript'
  | 'too_long'
  | 'no_evidence'
  | 'low_confidence_evidence'
  | 'ai_declared';

/** The AI's declared reason, set exactly when the reason code is ai_declared. */
export type AiDeclaredReason = 'insufficient_evidence' | 'not_applicable';

/**
 * Evidence is a reference to a segment of the evaluation's own transcript revision. Times and
 * text are always taken from that revision, never from model output.
 */
export interface Evidence {
  segmentId: string;
}

export interface CriterionEvaluation {
  criterionId: string;
  result: CriterionResultKind;
  reasonCode: NotAssessableReason | null;
  aiDeclaredReason: AiDeclaredReason | null;
  /** Actual points awarded (after any penalty) when assessed, otherwise null. */
  awardedPoints: number | null;
  /** Points available for the criterion in the evaluating scorecard version. */
  possiblePoints: number;
  /** Points deducted by an applied prohibited-expression penalty (0 if none). */
  penaltyPoints: number;
  rationale: string;
  evidence: readonly Evidence[];
}

export interface ProhibitedHit {
  expressionId: string;
  phrase: string;
  segmentId: string;
  speaker: Speaker;
  /** Penalty only under the active rule with reliable agent attribution; otherwise review. */
  disposition: 'penalty_applied' | 'flagged_for_review';
  penaltyPoints: number;
}

export type EvaluationOutcome = 'scored' | 'insufficient_evidence' | 'not_assessable';

export interface Evaluation {
  id: string;
  callId: string;
  agentId: string | null;
  scorecardId: string;
  scorecardVersion: number;
  /** The transcript revision this run evaluated; its evidence refers to that revision. */
  transcriptRevisionId: string;
  /**
   * Explicit run outcome from the backend. A failed evaluation creates no run: failures are
   * reported by the call status.
   */
  outcome: EvaluationOutcome;
  /** Points awarded across assessable criteria. */
  awardedPoints: number;
  /** Points of criteria that could be assessed (scored), i.e. the denominator. */
  assessablePoints: number;
  /** Total points on the scorecard version. */
  possiblePoints: number;
  minimumAssessablePoints: number;
  /**
   * The displayed score in hundredths of the 0–10 scale, from the backend (contract v0.1 3.4,
   * CONFIRMED): integer 0–1000, non-null exactly when the outcome is `scored`. 699 = "6.99 / 10".
   * The frontend never computes it.
   */
  displayHundredths: number | null;
  /** Backend's low-score flag, fixed with the run's own threshold; null unless scored (3.7). */
  belowThreshold: boolean | null;
  /** The run's own low-score threshold in hundredths (3.7); null when not served. */
  thresholdHundredths: number | null;
  criteria: readonly CriterionEvaluation[];
  prohibitedHits: readonly ProhibitedHit[];
  trigger: 'initial' | 'rescore';
  supersedesId: string | null;
  createdAt: string;
  simulated: boolean;
}

export interface BrandTokens {
  primary?: string | undefined;
  primaryHover?: string | undefined;
  primarySoft?: string | undefined;
  primaryText?: string | undefined;
}
