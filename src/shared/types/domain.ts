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
  | 'calls.review'
  | 'reports.export'
  | 'reports.manage'
  | 'settings.manage'
  | 'queues.manage'
  | 'ai.manage'
  | 'dictionary.manage'
  | 'dictionary.review'
  | 'pbx.manage'
  | 'notifications.manage'
  | 'users.manage'
  | 'security.manage'
  | 'storage.manage'
  | 'backups.manage'
  | 'system.view'
  | 'audit.view'
  | 'audit.export'
  | 'branding.manage';

export interface Session {
  mode: 'mock' | 'live';
  displayName: string;
  permissions: readonly Permission[];
  expiresAt: string | null;
}

export type QueueStatus = 'active' | 'disabled';

export interface Queue {
  id: string;
  /** Yeastar queue number, e.g. "6001" (Sales) or "6002" (After-Sales). */
  number: string;
  name: LocalizedText;
  /** Disabled queues are kept with their full history; they are never deleted. */
  status?: QueueStatus;
  description?: string;
  synthetic?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface QueueInput {
  number: string;
  name: LocalizedText;
  description: string;
}

export type AgentStatus = 'active' | 'inactive';

export interface Agent {
  /** Stable internal id. Opaque: conventions are not yet confirmed by the backend. */
  id: string;
  displayName: string;
  /** Configurable Yeastar extension or agent number. */
  extension: string;
  status: AgentStatus;
  queueIds: readonly string[];
  synthetic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentInput {
  displayName: string;
  extension: string;
  status: AgentStatus;
  queueIds: readonly string[];
}

export interface AuditChange {
  field: string;
  before: string | null;
  after: string | null;
}

export interface AuditEntry {
  id: string;
  action: 'created' | 'updated' | 'disabled' | 'enabled';
  actor: string;
  at: string;
  changes: readonly AuditChange[];
}

export type CallStatus = 'uploaded' | 'transcribing' | 'scoring' | 'scored' | 'failed';

export interface Call {
  id: string;
  title: string;
  agentId: string | null;
  queueId: string | null;
  language: Language | 'mixed';
  durationMs: number | null;
  recordedAt: string;
  status: CallStatus;
  audioUrl: string | null;
  synthetic: boolean;
  /** True when processing was simulated by the mock backend. */
  simulated: boolean;
  source: 'fixture' | 'upload' | 'pbx';
  /**
   * 'dual' = agent and customer on separate channels (speaker attribution reliable);
   * 'mixed' = single mixed channel: speakers stay unresolved unless evidence supports them.
   */
  channelLayout: 'dual' | 'mixed';
  /** Caller number as served by the backend: masked by default (e.g. "•••• 4821"). */
  callerMasked: string | null;
  classification: CallClassification | null;
  review: CallReview;
}

export type CallReason =
  | 'billing'
  | 'technical'
  | 'plan_change'
  | 'new_service'
  | 'cancellation'
  | 'general_inquiry'
  | 'other';

/** AI classification of the call (simulated in mock mode). */
export interface CallClassification {
  reason: CallReason;
  complaint: boolean;
  serviceRequest: boolean;
  confidence: number;
}

export type ReviewStatus = 'unreviewed' | 'reviewed' | 'needs_follow_up';

export interface CallReview {
  status: ReviewStatus;
  note: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export type ScoreBand = 'low' | 'meets' | 'no_score' | 'unscored';

/** Filters for the paginated calls list (all optional). Dates are inclusive YYYY-MM-DD. */
export interface CallQuery {
  from?: string | undefined;
  to?: string | undefined;
  queueId?: string | undefined;
  agentId?: string | undefined;
  reason?: CallReason | undefined;
  scoreBand?: ScoreBand | undefined;
  reviewStatus?: ReviewStatus | undefined;
  search?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Inclusive calendar date range, YYYY-MM-DD. */
export interface DateRange {
  from: string;
  to: string;
}

/** Daily queue statistics from the PBX (Yeastar). Missed and abandoned are separate. */
export interface QueueDailyStat {
  date: string;
  queueId: string;
  incoming: number;
  answered: number;
  missed: number;
  abandoned: number;
  totalWaitS: number;
  maxWaitS: number;
  totalTalkS: number;
}

export interface AgentDailyStat {
  date: string;
  agentId: string;
  queueId: string;
  answered: number;
  missed: number;
  totalTalkS: number;
}

export interface PbxMetrics {
  queueDaily: QueueDailyStat[];
  agentDaily: AgentDailyStat[];
  simulated: boolean;
}

export type LiveAgentState = 'available' | 'ringing' | 'on_call' | 'paused' | 'offline';

export interface LiveStatus {
  generatedAt: string;
  simulated: boolean;
  queues: {
    queueId: string;
    waiting: number;
    longestWaitS: number;
    activeCalls: number;
    agentsAvailable: number;
  }[];
  agents: { agentId: string; state: LiveAgentState; sinceS: number; queueIds: string[] }[];
  calls: {
    id: string;
    queueId: string;
    agentId: string | null;
    state: 'waiting' | 'ringing' | 'talking';
    durationS: number;
    callerMasked: string;
  }[];
}

/** Light classification rows used for customer-insight aggregation. */
export interface InsightRow {
  callId: string;
  recordedAt: string;
  queueId: string | null;
  agentId: string | null;
  reason: CallReason;
  complaint: boolean;
  serviceRequest: boolean;
}

export interface AudioSampleRequest {
  agentIds: readonly string[];
  range: DateRange;
  count: number;
  minDurationMs: number;
}

export interface AudioSample {
  seed: string;
  simulated: boolean;
  agents: { agentId: string; requested: number; eligible: number; calls: Call[] }[];
}

export type ReportPeriod = 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface ReportRecord {
  id: string;
  title: string;
  period: ReportPeriod;
  range: DateRange;
  queueIds: string[];
  agentIds: string[];
  createdAt: string;
  createdBy: string;
  emailStatus: 'not_sent' | 'simulated_sent' | 'sent';
  simulated: boolean;
}

export interface CallUpload {
  file: File;
  title: string;
  agentId: string;
}

/** 'unresolved' until speaker attribution is supported by evidence (e.g. mixed channel). */
export type Speaker = 'agent' | 'customer' | 'unresolved';

export interface TranscriptSegment {
  id: string;
  startMs: number;
  endMs: number;
  speaker: Speaker;
  language: Language;
  text: string;
}

export interface Transcript {
  callId: string;
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

export type CriterionResultKind = 'scored' | 'not_assessable' | 'insufficient_evidence';

export interface Evidence {
  segmentId: string;
  startMs: number;
  endMs: number;
  quote: string;
}

export interface CriterionEvaluation {
  criterionId: string;
  result: CriterionResultKind;
  /** Actual points awarded (after any penalty) when `result === 'scored'`, otherwise null. */
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
  startMs: number;
  quote: string;
  speaker: Speaker;
  /** Penalty only under the active rule with reliable agent attribution; otherwise review. */
  disposition: 'penalty_applied' | 'flagged_for_review';
  penaltyPoints: number;
}

export interface Evaluation {
  id: string;
  callId: string;
  /** When the evaluated call was recorded (used for date filters and trends). */
  callRecordedAt: string;
  agentId: string | null;
  scorecardId: string;
  scorecardVersion: number;
  status: 'completed' | 'failed';
  /**
   * 'insufficient_evidence' = fewer assessable points than the minimum: no score.
   * null when the evaluation failed (a processing failure, not an evidence result).
   */
  outcome: 'scored' | 'insufficient_evidence' | null;
  /** Points awarded across assessable criteria. */
  awardedPoints: number;
  /** Points of criteria that could be assessed (scored), i.e. the denominator. */
  assessablePoints: number;
  /** Total points on the scorecard version. */
  possiblePoints: number;
  minimumAssessablePoints: number;
  /** awardedPoints / assessablePoints × 10 when scored; null for insufficient evidence. */
  overallScore: number | null;
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

export interface Branding {
  productName: LocalizedText | null;
  organizationName: LocalizedText | null;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  tokens: { light: BrandTokens; dark: BrandTokens };
}

/* ------------------------------------------------------------------------------------------ */
/* Administration (Phase B). Settings are server-side API resources; every change is audited. */
/* ------------------------------------------------------------------------------------------ */

export type AdminResource =
  | 'queue'
  | 'ai_config'
  | 'ai_jobs'
  | 'dictionary_entry'
  | 'dictionary_correction'
  | 'pbx_connector'
  | 'email_sender'
  | 'notification_rule'
  | 'email_template'
  | 'report_email'
  | 'report_settings'
  | 'report_run'
  | 'user'
  | 'session'
  | 'security_policy'
  | 'auth'
  | 'storage_settings'
  | 'storage_item'
  | 'backup'
  | 'backup_settings'
  | 'restore'
  | 'system_error'
  | 'audit_log'
  | 'app_settings'
  | 'branding';

export const ADMIN_AUDIT_ACTIONS = [
  'created',
  'updated',
  'disabled',
  'enabled',
  'version_saved',
  'tested',
  'sync_started',
  'paused',
  'resumed',
  'retried',
  'cancelled',
  'proposed',
  'approved',
  'rejected',
  'generated',
  'delivered',
  'assigned',
  'credential_replaced',
  'exported',
  'restored',
  'soft_deleted',
  'verified',
  'revoked',
  'unlocked',
  'password_reset',
  'mfa_reset',
  'mfa_enrolled',
  'login_succeeded',
  'login_failed',
  'locked_out',
  'acknowledged',
  'role_changed',
  'verification_sent',
] as const;
export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number];

/** Append-only audit record (GUI-X4): who, what, when, before/after. Never edited. */
export interface AdminAuditEntry {
  id: string;
  resource: AdminResource;
  resourceId: string | null;
  action: AdminAuditAction;
  actor: string;
  at: string;
  summary: string;
  changes: readonly AuditChange[];
  /** Outcome of the attempted action; denied = blocked by a permission or rule. */
  result: 'success' | 'failure' | 'denied';
  /** Correlates the entry with API requests and error-log records. */
  correlationId: string;
  simulated: boolean;
}

export interface AuditQuery {
  resource?: AdminResource | undefined;
  resourceId?: string | undefined;
  action?: AdminAuditAction | undefined;
  result?: AdminAuditEntry['result'] | undefined;
  actor?: string | undefined;
  search?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

export interface AuditExport {
  exportedAt: string;
  count: number;
  entries: readonly AdminAuditEntry[];
  simulated: boolean;
}

/* AI administration ------------------------------------------------------------------------ */

export type AiModelKind = 'transcription' | 'evaluation';

/** A locally installed on-premise model as reported by the backend (synthetic in mock mode). */
export interface AiModel {
  id: string;
  kind: AiModelKind;
  name: string;
  version: string;
  sizeGb: number;
  minVramGb: number;
  languages: readonly string[];
  status: 'available' | 'not_installed' | 'incompatible';
  synthetic: boolean;
}

export type AiPromptKind = 'evaluation' | 'classification' | 'summary';
export type TranscriptionLanguage = 'ar-IQ' | 'ar' | 'auto';
export type Diarization = 'channel' | 'model' | 'off';
export type LowConfidenceAction = 'flag_for_review' | 'exclude_from_reports';

export interface AiLimits {
  maxConcurrentJobs: number;
  maxAudioMinutes: number;
  maxQueueLength: number;
  retryLimit: number;
  jobTimeoutMinutes: number;
}

export interface AiConfigDraft {
  transcriptionModelId: string;
  evaluationModelId: string;
  language: TranscriptionLanguage;
  diarization: Diarization;
  applyDictionary: boolean;
  temperature: number;
  minClassificationConfidence: number;
  lowConfidenceAction: LowConfidenceAction;
  requireEvidenceQuotes: boolean;
  /** 'latest' follows the current scorecard; 'pinned' evaluates with one fixed version. */
  scorecardBinding: 'latest' | 'pinned';
  pinnedScorecardVersion: number | null;
  limits: AiLimits;
  prompts: Readonly<Record<AiPromptKind, string>>;
  changeNote: string;
}

/** Saved AI configuration. Each save creates a new immutable version. */
export interface AiConfigVersion extends AiConfigDraft {
  version: number;
  createdAt: string;
  createdBy: string;
  simulated: boolean;
}

export type AiServiceState = 'ready' | 'loading' | 'degraded' | 'offline';

export interface AiStatus {
  generatedAt: string;
  simulated: boolean;
  configVersion: number;
  services: readonly {
    kind: AiModelKind;
    state: AiServiceState;
    modelId: string;
    message: string;
  }[];
}

export type AiJobState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AiJob {
  id: string;
  callId: string;
  stage: 'transcription' | 'evaluation' | 'classification';
  state: AiJobState;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  error: string | null;
}

export interface AiJobQueue {
  paused: boolean;
  simulated: boolean;
  jobs: readonly AiJob[];
}

/* Iraqi Arabic dictionary ------------------------------------------------------------------ */

export type DictionaryKind = 'dialect_expression' | 'spelling_variant' | 'product_term';
export type DictionaryStatus = 'active' | 'disabled';

export interface DictionaryEntry {
  id: string;
  kind: DictionaryKind;
  /** The form as spoken/heard (Iraqi dialect, colloquial spelling or product name). */
  term: string;
  /** Alternative spellings and common transcription errors that map to this entry. */
  variants: readonly string[];
  /** Standard form used in normalized transcripts and analysis. */
  standard: string;
  meaningEn: string;
  notes: string;
  status: DictionaryStatus;
  version: number;
  updatedAt: string;
  updatedBy: string;
  synthetic: boolean;
}

export interface DictionaryEntryInput {
  kind: DictionaryKind;
  term: string;
  variants: readonly string[];
  standard: string;
  meaningEn: string;
  notes: string;
  changeNote: string;
}

/** Immutable snapshot of one entry version. */
export interface DictionaryEntryVersion {
  entryId: string;
  version: number;
  action: 'created' | 'updated' | 'disabled' | 'enabled';
  kind: DictionaryKind;
  term: string;
  variants: readonly string[];
  standard: string;
  meaningEn: string;
  notes: string;
  status: DictionaryStatus;
  changeNote: string;
  changedAt: string;
  changedBy: string;
}

export interface DictionaryQuery {
  search?: string | undefined;
  kind?: DictionaryKind | undefined;
  status?: DictionaryStatus | undefined;
}

export type CorrectionStatus = 'pending' | 'approved' | 'rejected';

/** A supervised transcript correction: proposed by one person, reviewed by another. */
export interface DictionaryCorrection {
  id: string;
  callId: string;
  segmentId: string | null;
  heard: string;
  proposed: string;
  kind: DictionaryKind;
  proposedBy: string;
  proposedAt: string;
  status: CorrectionStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string;
  entryId: string | null;
  synthetic: boolean;
}

export interface CorrectionProposal {
  callId: string;
  segmentId: string;
  heard: string;
  proposed: string;
  kind: DictionaryKind;
}

export interface CorrectionReview {
  decision: 'approve' | 'reject';
  note: string;
  addToDictionary: boolean;
}

/* PBX administration ----------------------------------------------------------------------- */

export type PbxCapability = 'cdr' | 'recordings' | 'queue_statistics' | 'live_events';

/** A PBX vendor adapter known to the backend. Adding a vendor needs no frontend rewrite. */
export interface PbxVendorInfo {
  id: string;
  name: string;
  status: 'supported' | 'planned';
  capabilities: readonly PbxCapability[];
}

export type PbxSettingValue = string | number | boolean;
export type PbxSettings = Readonly<Record<string, PbxSettingValue>>;

export type PbxConnectionState =
  'not_configured' | 'configured' | 'connected' | 'error' | 'disabled';

export interface PbxSyncRun {
  id: string;
  connectorId: string;
  trigger: 'manual' | 'scheduled';
  status: 'running' | 'completed' | 'failed' | 'simulated';
  from: string;
  to: string;
  startedAt: string;
  finishedAt: string | null;
  cdrRecords: number;
  recordings: number;
  queueStatDays: number;
  message: string;
  startedBy: string;
}

export interface PbxConnector {
  id: string;
  vendor: string;
  name: string;
  /** Vendor-specific, non-secret settings (host, port, client id…). */
  settings: PbxSettings;
  /** Whether a credential is stored. The credential itself is never returned. */
  credentialSet: boolean;
  credentialUpdatedAt: string | null;
  queueIds: readonly string[];
  /** First day (YYYY-MM-DD) from which calls and statistics are ingested. */
  ingestionStartDate: string;
  pollIntervalMinutes: number;
  enabled: boolean;
  state: PbxConnectionState;
  stateMessage: string;
  checkedAt: string | null;
  lastSync: PbxSyncRun | null;
  updatedAt: string;
  simulated: boolean;
}

export interface PbxConnectorInput {
  name: string;
  settings: PbxSettings;
  queueIds: readonly string[];
  ingestionStartDate: string;
  pollIntervalMinutes: number;
  /** Write-only. Empty keeps the stored credential. */
  secret: string;
}

export type PbxTestStepResult = 'passed' | 'failed' | 'skipped';

export interface PbxTestResult {
  ok: boolean;
  simulated: boolean;
  checkedAt: string;
  steps: readonly {
    step: 'settings' | 'credentials' | 'network' | 'queues';
    result: PbxTestStepResult;
    message: string;
  }[];
}

/* Notifications and email ------------------------------------------------------------------ */

export type SenderState = 'not_configured' | 'configured' | 'verified' | 'error';

/** Dedicated Microsoft 365 sender mailbox (app registration). The secret is write-only. */
export interface EmailSender {
  provider: 'microsoft_365';
  senderAddress: string;
  displayName: string;
  tenantId: string;
  clientId: string;
  replyTo: string;
  credentialSet: boolean;
  credentialUpdatedAt: string | null;
  state: SenderState;
  stateMessage: string;
  checkedAt: string | null;
  updatedAt: string;
  simulated: boolean;
}

export interface EmailSenderInput {
  senderAddress: string;
  displayName: string;
  tenantId: string;
  clientId: string;
  replyTo: string;
  /** Write-only. Empty keeps the stored secret. */
  secret: string;
}

export type NotificationTrigger = 'low_score' | 'insufficient_evidence' | 'prohibited_flag';

export interface NotificationRuleInput {
  name: string;
  trigger: NotificationTrigger;
  enabled: boolean;
  /** 'scorecard' uses each evaluation's own scorecard threshold. */
  thresholdMode: 'scorecard' | 'custom';
  customThreshold: number | null;
  /** Empty = all queues. */
  queueIds: readonly string[];
  recipients: readonly string[];
  delivery: 'immediate' | 'daily_digest';
  templateId: string;
}

export interface NotificationRule extends NotificationRuleInput {
  id: string;
  updatedAt: string;
  synthetic: boolean;
}

export type EmailTemplateKind = 'low_quality_alert' | 'management_report';

export interface EmailTemplate {
  id: string;
  kind: EmailTemplateKind;
  name: string;
  language: Language;
  subject: string;
  body: string;
  version: number;
  updatedAt: string;
  updatedBy: string;
}

export interface EmailTemplateInput {
  name: string;
  language: Language;
  subject: string;
  body: string;
  changeNote: string;
}

export interface ReportEmailOptions {
  recipients: readonly string[];
  cc: readonly string[];
  includeQueueReport: boolean;
  includeAgentReport: boolean;
  includeAudioSample: boolean;
  attachExcel: boolean;
  language: Language | 'both';
  templateId: string;
  updatedAt: string;
}

export type DeliveryKind = 'test' | 'low_quality_alert' | 'management_report';

/** Immutable delivery record. In mock mode every record is 'simulated' — nothing is sent. */
export interface DeliveryRecord {
  id: string;
  at: string;
  kind: DeliveryKind;
  recipients: readonly string[];
  subject: string;
  status: 'simulated' | 'sent' | 'failed';
  detail: string;
  relatedId: string | null;
}

/* Report configuration --------------------------------------------------------------------- */

export interface ReportSettingsInput {
  /** Approved policy: 5 answered calls per agent, each at least 60 seconds. */
  callsPerAgent: number;
  minDurationSeconds: number;
  defaultQueueIds: readonly string[];
  agentSelection: 'all_active' | 'selected';
  defaultAgentIds: readonly string[];
  delivery: 'download_only' | 'email_on_generate';
  /** Requests for automatic scheduling are rejected until it is authorized. */
  automaticScheduling: boolean;
  changeNote: string;
}

export interface ReportSettings extends Omit<ReportSettingsInput, 'changeNote'> {
  version: number;
  answeredOnly: true;
  schedulingAuthorized: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface ReportRunRequest {
  period: 'weekly' | 'custom';
  range: DateRange;
  agentIds: readonly string[];
  queueIds: readonly string[];
  deliver: boolean;
}

export interface ReportRun {
  report: ReportRecord;
  sample: AudioSample;
  delivery: DeliveryRecord | null;
  settingsVersion: number;
}
