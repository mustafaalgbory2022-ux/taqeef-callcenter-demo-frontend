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

export interface Session {
  mode: 'mock' | 'live';
  displayName: string;
  permissions: readonly Permission[];
  expiresAt: string | null;
}

export interface Queue {
  id: string;
  name: LocalizedText;
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
  source: 'fixture' | 'upload';
}

export interface CallUpload {
  file: File;
  title: string;
  agentId: string;
}

export type Speaker = 'agent' | 'customer';

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
  weight: number;
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
  criteria: readonly Criterion[];
  prohibitedExpressions: readonly ProhibitedExpression[];
  createdAt: string;
  createdBy: string;
  changeNote: string;
}

export type ScorecardDraft = Pick<
  ScorecardVersion,
  'name' | 'lowScoreThreshold' | 'criteria' | 'prohibitedExpressions' | 'changeNote'
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
  /** Whole points 0–10 when `result === 'scored'`, otherwise null. */
  score: number | null;
  rationale: string;
  evidence: readonly Evidence[];
}

export interface ProhibitedHit {
  expressionId: string;
  phrase: string;
  segmentId: string;
  startMs: number;
  quote: string;
}

export interface Evaluation {
  id: string;
  callId: string;
  agentId: string | null;
  scorecardId: string;
  scorecardVersion: number;
  status: 'completed' | 'failed';
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
