import type {
  AudioSample,
  AudioSampleRequest,
  CallQuery,
  CallReview,
  DateRange,
  InsightRow,
  LiveStatus,
  Page,
  PbxMetrics,
  ReportPeriod,
  ReportRecord,
  Agent,
  AgentInput,
  AuditEntry,
  Branding,
  Call,
  CallUpload,
  Evaluation,
  Queue,
  ScorecardDraft,
  ScorecardVersion,
  Session,
  Transcript,
} from '@/shared/types/domain';
import type { ApiMode } from './config';
import { endpoints } from './endpoints';
import { createAiAdminApi, type AiAdminApi } from './adapters/ai';
import { createAuditApi, type AuditApi } from './adapters/audit';
import { createDictionaryApi, type DictionaryApi } from './adapters/dictionary';
import { createNotificationsApi, type NotificationsApi } from './adapters/notifications';
import { createPbxAdminApi, type PbxAdminApi } from './adapters/pbx';
import { createReportSettingsApi, type ReportSettingsApi } from './adapters/reportSettings';
import { createBackupsApi, type BackupsApi } from './adapters/backups';
import { createStorageApi, type StorageApi } from './adapters/storage';
import { createAuthApi, createUsersApi, type AuthApi, type UsersApi } from './adapters/users';
import { createQueueAdminApi, type QueueAdminApi } from './adapters/queues';
import { ApiError } from './errors';
import { createSend, listOf as listPair } from './send';
import type { Transport } from './transport';
import {
  agentFromWire,
  agentInputToWire,
  auditFromWire,
  queueFromWire,
  wireAgent,
  wireAuditEntry,
  wireQueue,
} from './wire/agents';
import { brandingFromWire, wireBranding } from './wire/branding';
import {
  callFromWire,
  reviewToWire,
  transcriptFromWire,
  wireCall,
  wireCallPage,
  wireTranscript,
} from './wire/calls';
import {
  insightFromWire,
  liveFromWire,
  pbxFromWire,
  reportFromWire,
  wireInsightRow,
  wireLiveStatus,
  wirePbxMetrics,
  wireReport,
} from './wire/operations';
import {
  bool as decBool,
  arrayOf as listOf,
  num as decNum,
  object as decObject,
  str as decStr,
} from './decode';
import { evaluationFromWire, wireEvaluation } from './wire/evaluations';
import { scorecardDraftToWire, scorecardFromWire, wireScorecardVersion } from './wire/scorecards';
import { sessionFromWire, wireSession } from './wire/session';

export interface EvaluationFilter {
  callId?: string | undefined;
  agentId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  queueId?: string | undefined;
}

export interface ReportInput {
  title: string;
  period: ReportPeriod;
  range: DateRange;
  queueIds: readonly string[];
  agentIds: readonly string[];
}

/** The only data-access surface for UI code. Returns domain types; throws ApiError. */
export interface ApiClient {
  readonly mode: ApiMode;
  getSession(): Promise<Session | null>;
  openSession(launchCode: string): Promise<Session>;
  getBranding(): Promise<Branding>;
  listQueues(): Promise<Queue[]>;
  listAgents(): Promise<Agent[]>;
  createAgent(input: AgentInput): Promise<Agent>;
  updateAgent(id: string, patch: Partial<AgentInput>): Promise<Agent>;
  getAgentHistory(id: string): Promise<AuditEntry[]>;
  listCalls(query?: CallQuery): Promise<Page<Call>>;
  reviewCall(id: string, review: Pick<CallReview, 'status' | 'note'>): Promise<Call>;
  getPbxMetrics(range: DateRange, queueId?: string): Promise<PbxMetrics>;
  getLiveStatus(): Promise<LiveStatus>;
  listInsights(
    range: DateRange,
    filter?: { queueId?: string | undefined; agentId?: string | undefined },
  ): Promise<InsightRow[]>;
  sampleAudio(request: AudioSampleRequest): Promise<AudioSample>;
  listReports(): Promise<ReportRecord[]>;
  saveReport(input: ReportInput): Promise<ReportRecord>;
  emailReport(id: string): Promise<ReportRecord>;
  getCall(id: string): Promise<Call>;
  uploadCall(upload: CallUpload): Promise<Call>;
  getTranscript(callId: string): Promise<Transcript>;
  listEvaluations(filter?: EvaluationFilter): Promise<Evaluation[]>;
  rescoreCall(callId: string): Promise<Evaluation>;
  getCurrentScorecard(): Promise<ScorecardVersion>;
  listScorecardVersions(): Promise<ScorecardVersion[]>;
  saveScorecardVersion(draft: ScorecardDraft): Promise<ScorecardVersion>;
  /** Administration adapters (Phase B) — each replaceable on its own. */
  readonly audit: AuditApi;
  readonly queueAdmin: QueueAdminApi;
  readonly ai: AiAdminApi;
  readonly dictionary: DictionaryApi;
  readonly pbx: PbxAdminApi;
  readonly notifications: NotificationsApi;
  readonly reportSettings: ReportSettingsApi;
  readonly users: UsersApi;
  readonly auth: AuthApi;
  readonly storage: StorageApi;
  readonly backups: BackupsApi;
}

export function createApiClient(transport: Transport, mode: ApiMode): ApiClient {
  const send = createSend(transport);
  const list = listPair;

  const agents = list(wireAgent, agentFromWire);
  const evaluations = list(wireEvaluation, evaluationFromWire);
  const versions = list(wireScorecardVersion, scorecardFromWire);
  const queues = list(wireQueue, queueFromWire);
  const audit = list(wireAuditEntry, auditFromWire);

  return {
    mode,
    audit: createAuditApi(send),
    queueAdmin: createQueueAdminApi(send),
    ai: createAiAdminApi(send),
    dictionary: createDictionaryApi(send),
    pbx: createPbxAdminApi(send),
    notifications: createNotificationsApi(send),
    reportSettings: createReportSettingsApi(send),
    users: createUsersApi(send),
    auth: createAuthApi(send),
    storage: createStorageApi(send),
    backups: createBackupsApi(send),
    async getSession() {
      try {
        return await send({ method: 'GET', path: endpoints.session }, wireSession, sessionFromWire);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'unauthorized') return null;
        throw err;
      }
    },
    openSession: (launchCode) =>
      send(
        { method: 'POST', path: endpoints.sessionLaunch, body: { launch_code: launchCode.trim() } },
        wireSession,
        sessionFromWire,
      ),
    getBranding: () =>
      send({ method: 'GET', path: endpoints.branding }, wireBranding, brandingFromWire),
    listQueues: () => send({ method: 'GET', path: endpoints.queues }, queues.decoder, queues.map),
    listAgents: () => send({ method: 'GET', path: endpoints.agents }, agents.decoder, agents.map),
    createAgent: (input) =>
      send(
        { method: 'POST', path: endpoints.agents, body: agentInputToWire(input) },
        wireAgent,
        agentFromWire,
      ),
    updateAgent: (id, patch) =>
      send(
        { method: 'PATCH', path: endpoints.agent(id), body: agentInputToWire(patch) },
        wireAgent,
        agentFromWire,
      ),
    getAgentHistory: (id) =>
      send({ method: 'GET', path: endpoints.agentHistory(id) }, audit.decoder, audit.map),
    listCalls: (query = {}) =>
      send(
        {
          method: 'GET',
          path: endpoints.calls,
          query: {
            from: query.from,
            to: query.to,
            queue_id: query.queueId,
            agent_id: query.agentId,
            reason: query.reason,
            score_band: query.scoreBand,
            review_status: query.reviewStatus,
            search: query.search,
            page: query.page === undefined ? undefined : String(query.page),
            page_size: query.pageSize === undefined ? undefined : String(query.pageSize),
          },
        },
        wireCallPage,
        (w) => ({
          items: w.items.map(callFromWire),
          total: w.total,
          page: w.page,
          pageSize: w.page_size,
        }),
      ),
    reviewCall: (id, review) =>
      send(
        { method: 'PUT', path: endpoints.callReview(id), body: reviewToWire(review) },
        wireCall,
        callFromWire,
      ),
    getPbxMetrics: (range, queueId) =>
      send(
        {
          method: 'GET',
          path: endpoints.pbxMetrics,
          query: { from: range.from, to: range.to, queue_id: queueId },
        },
        wirePbxMetrics,
        pbxFromWire,
      ),
    getLiveStatus: () =>
      send({ method: 'GET', path: endpoints.liveStatus }, wireLiveStatus, liveFromWire),
    listInsights: (range, filter = {}) =>
      send(
        {
          method: 'GET',
          path: endpoints.insights,
          query: {
            from: range.from,
            to: range.to,
            queue_id: filter.queueId,
            agent_id: filter.agentId,
          },
        },
        listOf(wireInsightRow),
        (rows) => rows.map(insightFromWire),
      ),
    sampleAudio: (req) =>
      send(
        {
          method: 'POST',
          path: endpoints.audioSample,
          body: {
            agent_ids: [...req.agentIds],
            from: req.range.from,
            to: req.range.to,
            count: req.count,
            min_duration_ms: req.minDurationMs,
          },
        },
        decObject({
          seed: decStr,
          simulated: decBool,
          agents: listOf(
            decObject({
              agent_id: decStr,
              requested: decNum,
              eligible: decNum,
              calls: listOf(wireCall),
            }),
          ),
        }),
        (w) => ({
          seed: w.seed,
          simulated: w.simulated,
          agents: w.agents.map((a) => ({
            agentId: a.agent_id,
            requested: a.requested,
            eligible: a.eligible,
            calls: a.calls.map(callFromWire),
          })),
        }),
      ),
    listReports: () =>
      send({ method: 'GET', path: endpoints.reports }, listOf(wireReport), (rs) =>
        rs.map(reportFromWire),
      ),
    saveReport: (input) =>
      send(
        {
          method: 'POST',
          path: endpoints.reports,
          body: {
            title: input.title.trim(),
            period: input.period,
            from: input.range.from,
            to: input.range.to,
            queue_ids: [...input.queueIds],
            agent_ids: [...input.agentIds],
          },
        },
        wireReport,
        reportFromWire,
      ),
    emailReport: (id) =>
      send({ method: 'POST', path: endpoints.reportEmail(id) }, wireReport, reportFromWire),
    getCall: (id) => send({ method: 'GET', path: endpoints.call(id) }, wireCall, callFromWire),
    uploadCall: ({ file, title, agentId }) => {
      const form = new FormData();
      form.append('file', file);
      form.append('title', title.trim());
      form.append('agent_id', agentId);
      return send({ method: 'POST', path: endpoints.calls, body: form }, wireCall, callFromWire);
    },
    getTranscript: (callId) =>
      send(
        { method: 'GET', path: endpoints.transcript(callId) },
        wireTranscript,
        transcriptFromWire,
      ),
    listEvaluations: (filter = {}) =>
      send(
        {
          method: 'GET',
          path: endpoints.evaluations,
          query: {
            call_id: filter.callId,
            agent_id: filter.agentId,
            from: filter.from,
            to: filter.to,
            queue_id: filter.queueId,
          },
        },
        evaluations.decoder,
        evaluations.map,
      ),
    rescoreCall: (callId) =>
      send({ method: 'POST', path: endpoints.rescore(callId) }, wireEvaluation, evaluationFromWire),
    getCurrentScorecard: () =>
      send(
        { method: 'GET', path: endpoints.scorecardCurrent },
        wireScorecardVersion,
        scorecardFromWire,
      ),
    listScorecardVersions: () =>
      send({ method: 'GET', path: endpoints.scorecardVersions }, versions.decoder, versions.map),
    saveScorecardVersion: (draft) =>
      send(
        { method: 'POST', path: endpoints.scorecardVersions, body: scorecardDraftToWire(draft) },
        wireScorecardVersion,
        scorecardFromWire,
      ),
  };
}
