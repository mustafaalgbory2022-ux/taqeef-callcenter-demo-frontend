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
  /** `agent_id`: opaque, server-generated, never reused. */
  id: string;
  /** Masked presentation name (contract v0.3 §2.2.1); immutable, never edited. */
  displayName: string;
  createdAt: string;
  /** Null while active; set once when retired (never reactivated). */
  retiredAt: string | null;
  /** Derived from `retiredAt`. */
  status: AgentStatus;
}

/** Create-only input: names are immutable (no rename route). */
export interface AgentInput {
  displayName: string;
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

/** Probe rejection reasons (contract v0.3 §5.1, enum CONFIRMED). */
export const REJECTION_REASONS = [
  'unsupported_format',
  'unreadable',
  'too_long',
  'too_short',
  'channels',
] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];

/** `latest_run` on a call: latest completed run of any version (contract v0.3 §5.3, PROPOSED). */
export interface CallLatestRun {
  runId: string;
  scorecardVersionId: string;
  scorecardVersionNumber: number;
  outcome: EvaluationOutcome;
  displayHundredths: number | null;
  belowThreshold: boolean | null;
  thresholdHundredths: number;
  completedAt: string;
}

/** `latest_job` on a call (contract v0.3 §5.3, PROPOSED). */
export interface CallLatestJob {
  jobId: string;
  kind: 'probe' | 'transcribe' | 'evaluate';
  state: JobState;
  errorCode: string | null;
  retry: 'yes' | 'user_action' | 'no' | 'n/a';
}

/** Call list item / detail (contract v0.3 §5.3; shape PROPOSED, enums CONFIRMED). */
export interface Call {
  /** `call_id` (opaque). */
  id: string;
  /** `display_name`: the call title, served masked; the server default is `Untitled call`. */
  title: string;
  /** Required at upload; a call's agent never changes. */
  agentId: string;
  /** Masked agent name served with the call; stays after the agent is retired. */
  agentDisplayName: string;
  uploadedAt: string;
  status: CallStatus;
  /** Non-null exactly when `status = rejected`. */
  rejectionReason: RejectionReason | null;
  /** Soft-deleted ("hidden"); runs, transcripts and audio are kept. */
  hidden: boolean;
  durationMs: number | null;
  /** Known once probed. */
  channels: 1 | 2 | null;
  channelMap: ChannelMap | null;
  /** Current transcript revision; null until transcription has produced one. */
  currentTranscriptRevisionId: string | null;
  latestRun: CallLatestRun | null;
  latestJob: CallLatestJob | null;
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

/** One segment of a transcript revision (contract v0.3 §6.2; fields CONFIRMED, shape PROPOSED). */
export interface TranscriptSegment {
  /** `segment_id`: unique within its revision only. */
  id: string;
  startMs: number;
  endMs: number;
  channel: 'L' | 'R' | 'M';
  speakerLabel: 'CH-L' | 'CH-R' | 'MONO';
  /** Masked by the server (§2.2). */
  text: string;
  language: string;
  asrConfidencePermille: number;
  lowConfidence: boolean;
  flags: readonly string[];
}

/** One immutable transcript revision's segments. Speaker roles come from a run (§6.2). */
export interface Transcript {
  revisionId: string;
  segments: readonly TranscriptSegment[];
}

/** Revision list item (contract v0.3 §6.1). */
export interface TranscriptRevision {
  revisionId: string;
  revisionNo: number;
  trigger: 'initial' | 'retranscribe';
  isCurrent: boolean;
  createdAt: string;
  channelMode: 'stereo_mapped' | 'stereo_unmapped' | 'stereo_as_mono' | 'mono';
  channelMap: ChannelMap;
  channelMapSource: 'configured' | 'suggested' | 'none';
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
  /** `scorecard_version_id` (contract v0.3 §10.5). */
  scorecardVersionId: string;
  /** Derived by the server: exactly one version is active (§10.1, CONFIRMED). */
  status: 'active' | 'retired';
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
/**
 * Evidence item (contract v0.3 §7.5, fields CONFIRMED). The reference is always the pair
 * {transcriptRevisionId, segmentId}. `excerpt` is the server's masked prefix of the segment
 * text (at most 2,000 characters); `excerptTruncated` drives a separate indicator.
 */
export interface Evidence {
  transcriptRevisionId: string;
  segmentId: string;
  startMs: number;
  endMs: number;
  excerpt: string;
  excerptTruncated: boolean;
  /** Whether the item counts as valid evidence for the result. */
  counted: boolean;
}

export interface CriterionEvaluation {
  criterionId: string;
  result: CriterionResultKind;
  reasonCode: NotAssessableReason | null;
  aiDeclaredReason: AiDeclaredReason | null;
  /**
   * All point values are stored INTEGER UNITS (contract v0.1 3.2, 3.5): with `unit = 2`, one
   * unit is half a point. Display with `fmt.points(units, unit)`; never as a quality score.
   */
  unit: PointUnit;
  /** `units_awarded` when assessed; null when not assessable (the wire sends 0 of 0). */
  awardedUnits: number | null;
  /** `units_possible`; 0 when not assessable. */
  possibleUnits: number;
  criterionVersion: number;
  /** Names from the run's own scorecard version (masked, §2.2). */
  name: LocalizedText;
  order: number;
  /** Set exactly when `partially_met`. */
  levelId: string | null;
  source: 'ai' | 'code_override' | 'code_na';
  /** What the AI decided when the code overrode it (`source = code_override`); no explanation. */
  aiOriginalDecision: {
    result: CriterionResultKind;
    levelId: string | null;
    aiDeclaredReason: AiDeclaredReason | null;
    evidenceSegmentIds: readonly string[];
  } | null;
  /** `explanation`: AI text, masked by the server, plain text only, at most 600 characters. */
  rationale: string;
  /** `explanation_truncated` (field name PROPOSED): the masked text was shortened. */
  explanationTruncated: boolean;
  evidence: readonly Evidence[];
}

/** Prohibited-phrase hit (contract v0.3 §7.6). It carries no excerpt: the UI shows its location. */
export interface ProhibitedHit {
  phraseId: string;
  matchMode: 'whole_words_clitic' | 'whole_words' | 'contains';
  transcriptRevisionId: string;
  segmentId: string;
  wordSpan: readonly [number, number];
  startMs: number;
  endMs: number;
  speakerRole: Speaker;
  reliabilityPermille: number;
  outcome: 'penalty' | 'review_flag' | 'none';
  flagType: string | null;
}

/** Review flag on a run (§7.7). Marking it reviewed never changes a score. */
export interface ReviewFlag {
  flagId: string;
  flagType: string;
  segmentId: string | null;
  reviewed: boolean;
  reviewedAt: string | null;
}

/** Speaker role of a segment as resolved by a run (§7.3 `segment_roles`). */
export interface SegmentRole {
  role: Speaker;
  nonParty: boolean;
}

/** Run history item (contract v0.3 §7.2): the call's `latest_run` shape plus trigger and link. */
export interface RunSummary extends CallLatestRun {
  trigger: RunTrigger;
  previousRunId: string | null;
}

export type RunTrigger = 'initial' | 'rescore' | 'rescore_all';

/** Point unit (contract v0.1 3.5): 1 = whole points, 2 = half points. */
export type PointUnit = 1 | 2;

export type EvaluationOutcome = 'scored' | 'insufficient_evidence' | 'not_assessable';

/** Run detail (contract v0.3 §7.3; shape PROPOSED, field names as-built). Sealed once written. */
export interface Evaluation {
  /** `run_id`. */
  id: string;
  callId: string;
  /** Not on the run: filled from the call when runs are listed for an agent; else null. */
  agentId: string | null;
  scorecardVersionId: string;
  /** `scorecard_version_number`. */
  scorecardVersion: number;
  /** The transcript revision this run evaluated; its evidence refers to that revision. */
  transcriptRevisionId: string;
  /**
   * Explicit run outcome from the backend. A failed evaluation creates no run: failures are
   * reported by the call status.
   */
  outcome: EvaluationOutcome;
  /** Point unit of every point value on this run: 1, or 2 for half points (3.5). */
  unit: PointUnit;
  /** `points_awarded_sum` (A), in units. */
  awardedUnits: number;
  /** `points_possible_sum` (P), in units: points of the assessed criteria (the denominator). */
  assessableUnits: number;
  /** Total units of the scorecard: 10 × unit (contract v0.3 §10.1, CONFIRMED). */
  possibleUnits: number;
  /** `min_assessable_units`. */
  minimumAssessableUnits: number;
  /**
   * The displayed score in hundredths of the 0–10 scale, from the backend (contract v0.1 3.4,
   * CONFIRMED): integer 0–1000, non-null exactly when the outcome is `scored`. 699 = "6.99 / 10".
   * The frontend never computes it.
   */
  displayHundredths: number | null;
  /** Backend's low-score flag, fixed with the run's own threshold; null unless scored (3.7). */
  belowThreshold: boolean | null;
  /** The run's own low-score threshold in hundredths (3.7). */
  thresholdHundredths: number | null;
  aiDeclaredCount: number;
  codeNaCount: number;
  /** Always true in the demo: every run is labelled "Preliminary". */
  preliminary: boolean;
  criteria: readonly CriterionEvaluation[];
  prohibitedHits: readonly ProhibitedHit[];
  reviewFlags: readonly ReviewFlag[];
  /** Speaker role per segment id of `transcriptRevisionId`, as resolved by this run. */
  segmentRoles: ReadonlyMap<string, SegmentRole>;
  trigger: RunTrigger;
  /** `previous_run_id`. */
  supersedesId: string | null;
  /** `completed_at`. */
  createdAt: string;
}

export interface BrandTokens {
  primary?: string | undefined;
  primaryHover?: string | undefined;
  primarySoft?: string | undefined;
  primaryText?: string | undefined;
}

/**
 * Dashboard figures computed by the SERVER (contract v0.3 §11, CONFIRMED: the frontend never
 * recomputes averages or classifications). Response shape PROPOSED (§11.4).
 */
export interface DashboardSummary {
  scope: 'all_versions' | 'version';
  scorecardVersionId: string | null;
  agentId: string | null;
  agentDisplayName: string | null;
  asOf: string;
  callsTotal: number;
  outcomes: { scored: number; insufficientEvidence: number; notAssessable: number };
  /** Overlaps `outcomes` (a failed re-evaluation keeps the earlier run); shown separately. */
  evaluationFailed: number;
  notYetEvaluated: number;
  /** Null when no scored run is selected. */
  average: { displayHundredths: number; basedOnN: number } | null;
  threshold:
    | { mode: 'single'; thresholdHundredths: number; averageBelowThreshold: boolean }
    | { mode: 'mixed' | 'none'; thresholdHundredths: null; averageBelowThreshold: null };
  /** Selected scored runs whose stored below_threshold is true. */
  belowThresholdCount: number;
  criteria: readonly {
    criterionId: string;
    criterionVersion: number;
    name: LocalizedText;
    met: number;
    partiallyMet: number;
    notMet: number;
    notAssessable: number;
  }[];
  prohibitedHits: { penalty: number; reviewFlag: number; none: number };
}

export interface DashboardQuery {
  /** null = all versions. */
  scorecardVersionId: string | null;
  agentId: string | null;
}
