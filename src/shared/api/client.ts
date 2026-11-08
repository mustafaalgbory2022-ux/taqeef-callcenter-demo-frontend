import type {
  Agent,
  AgentInput,
  Call,
  CallUpload,
  Evaluation,
  ScorecardDraft,
  ScorecardVersion,
  Session,
  Transcript,
  TranscriptRevision,
  RunSummary,
  UploadAccepted,
  DashboardQuery,
  DashboardSummary,
} from '@/shared/types/domain';
import { apiConfig, type ApiMode } from './config';
import { arrayOf, bool, DecodeError, nullable, object, type Decoder } from './decode';
import { endpoints } from './endpoints';
import { ApiError, toApiError } from './errors';
import type { ApiRequest, Transport } from './transport';
import { agentFromWire, agentInputToWire, wireAgent } from './wire/agents';
import {
  callFromWire,
  transcriptFromWire,
  uploadAcceptedFromWire,
  wireCall,
  wireTranscript,
  wireTranscriptRevision,
  transcriptRevisionFromWire,
  wireUploadAccepted,
} from './wire/calls';
import {
  evaluationFromWire,
  runSummaryFromWire,
  wireEvaluation,
  wireRunSummary,
} from './wire/evaluations';
import { scorecardDraftToWire, scorecardFromWire, wireScorecardVersion } from './wire/scorecards';
import { wireSessionExchange, wireSessionResume } from './wire/session';
import { dashboardFromWire, wireDashboard } from './wire/dashboard';

export interface CallFilter {
  agentId?: string | undefined;
  /** `include_hidden=true` (contract v0.3 §5.3); hidden calls are excluded by default. */
  includeHidden?: boolean | undefined;
}

/** Which runs a list view needs: one call's, or all calls' (optionally one agent's). */
export interface EvaluationFilter {
  callId?: string | undefined;
  agentId?: string | undefined;
}

/** The only data-access surface for UI code. Returns domain types; throws ApiError. */
export interface ApiClient {
  readonly mode: ApiMode;
  /** The session held in memory, or null. Never makes a request. */
  getSession(): Promise<Session | null>;
  /**
   * After a reload: recover the existing session's CSRF token with `GET /api/session` (the
   * first /api call, CSRF-exempt). Returns null on 401; the token stays in memory only.
   */
  resumeSession(): Promise<Session | null>;
  /** Exchange a one-time launch code; keeps the returned CSRF token in memory only. */
  openSession(launchCode: string): Promise<Session>;
  /** Called once whenever the backend ends the session (any 401). Returns an unsubscribe. */
  onSessionEnded(listener: () => void): () => void;
  /** Playback source for a call: the protected audio route (cookie, same-origin, no CSRF). */
  audioSrc(callId: string): string | null;
  /** Active agents; `includeRetired` adds retired ones for history views. */
  listAgents(options?: { includeRetired?: boolean }): Promise<Agent[]>;
  createAgent(input: AgentInput): Promise<Agent>;
  /** Irreversible: a retired agent is never reactivated. */
  retireAgent(id: string): Promise<Agent>;
  listCalls(filter?: CallFilter): Promise<Call[]>;
  getCall(id: string): Promise<Call>;
  uploadCall(upload: CallUpload): Promise<UploadAccepted>;
  /**
   * Soft delete (contract v0.3 §5.4): `DELETE /api/calls/{call_id}` with
   * `{request_id, reason?}`; the call is hidden, nothing is removed. Returns the call.
   */
  hideCall(id: string, reason?: string): Promise<Call>;
  /** `POST /api/calls/{call_id}/restore` with `{request_id}`. Returns the call. */
  restoreCall(id: string): Promise<Call>;
  /** One immutable transcript revision. */
  getTranscript(revisionId: string): Promise<Transcript>;
  /** Run history of one call, newest first (contract v0.3 #18, `{items: [run summary]}`). */
  listRunHistory(callId: string): Promise<RunSummary[]>;
  /** One sealed run with criteria, evidence, hits, flags and roles (#19). */
  getRun(runId: string): Promise<Evaluation>;
  /** Revision list of one call (#13). */
  listTranscriptRevisions(callId: string): Promise<TranscriptRevision[]>;
  rescoreCall(callId: string): Promise<Evaluation>;
  /**
   * The newest saved version. NOT necessarily the active one: the contract does not yet say
   * how the active version is reported, so the UI never labels this version as active.
   */
  getLatestScorecardVersion(): Promise<ScorecardVersion>;
  /** The version the server reports as `status: "active"` (contract v0.3 §10.1/§10.5). */
  getActiveScorecardVersion(): Promise<ScorecardVersion>;
  /** Server-computed dashboard figures (contract v0.3 §11; route PROPOSED). */
  getDashboard(query: DashboardQuery): Promise<DashboardSummary>;
  listScorecardVersions(): Promise<ScorecardVersion[]>;
  saveScorecardVersion(draft: ScorecardDraft): Promise<ScorecardVersion>;
}

/**
 * The local demo has a single operator session and no role model (demo API contract §1), so
 * a session holds every demo permission. The backend still enforces every route.
 */
const DEMO_PERMISSIONS = [
  'agents.manage',
  'scorecards.manage',
  'calls.upload',
  'evaluations.rescore',
  'settings.manage',
] as const;

export interface ApiClientOptions {
  /** Playback source override (the mock backend serves synthetic audio in the browser). */
  audioSrc?: (callId: string) => string | null;
}

/** Client-generated idempotency key for action requests (contract 5.1, CONFIRMED). */
const requestId = (): string => crypto.randomUUID();

export function createApiClient(
  transport: Transport,
  mode: ApiMode,
  options: ApiClientOptions = {},
): ApiClient {
  // Held in memory only: never written to storage, cookies, logs or the URL.
  let csrfToken: string | null = null;
  let session: Session | null = null;
  const endedListeners = new Set<() => void>();

  function endSession() {
    if (session === null && csrfToken === null) return;
    csrfToken = null;
    session = null;
    for (const listener of endedListeners) listener();
  }

  async function send<W, T>(req: ApiRequest, decoder: Decoder<W>, map: (w: W) => T): Promise<T> {
    // Every /api request carries the CSRF header, GET included (contract 1.7). The exchange
    // is exempt and is sent through `exchange` below.
    const headers = csrfToken ? { [apiConfig.csrfHeaderName]: csrfToken } : undefined;
    const res = await transport({ ...req, headers });
    if (res.status === 401) endSession();
    if (res.status >= 400) throw toApiError(res.status, res.body);
    try {
      return map(decoder(res.body));
    } catch (err) {
      if (err instanceof DecodeError) {
        throw new ApiError(
          'contract_mismatch',
          res.status,
          `${req.method} ${req.path}: ${err.message}`,
        );
      }
      throw err;
    }
  }

  // Lists are `{"items": [...], "truncated": false}` (contract v0.3 §2, PROPOSED). The demo
  // lists are small and never truncated; `truncated` is decoded but not needed by any view.
  const list = <W, T>(decoder: Decoder<W>, map: (w: W) => T) => ({
    decoder: object({ items: arrayOf(decoder), truncated: nullable(bool) }),
    map: (w: { items: W[] }) => w.items.map(map),
  });

  const agents = list(wireAgent, agentFromWire);
  const calls = list(wireCall, callFromWire);
  const runs = list(wireRunSummary, runSummaryFromWire);
  const revisions = list(wireTranscriptRevision, transcriptRevisionFromWire);
  const versions = list(wireScorecardVersion, scorecardFromWire);

  return {
    mode,
    getSession: () => Promise.resolve(session),
    async resumeSession() {
      if (session) return session;
      const res = await transport({ method: 'GET', path: endpoints.session });
      if (res.status === 401) return null;
      if (res.status >= 400) throw toApiError(res.status, res.body);
      let w;
      try {
        w = wireSessionResume(res.body);
      } catch (err) {
        if (err instanceof DecodeError) {
          throw new ApiError('contract_mismatch', res.status, `GET session: ${err.message}`);
        }
        throw err;
      }
      csrfToken = w.csrf_token;
      session = {
        mode,
        permissions: DEMO_PERMISSIONS,
        idleTimeoutS: w.idle_timeout_s,
        absoluteTimeoutS: w.absolute_timeout_s,
      };
      return session;
    },
    async openSession(launchCode) {
      csrfToken = null;
      session = null;
      const res = await transport({
        method: 'POST',
        path: endpoints.sessionExchange,
        body: { code: launchCode.trim() },
      });
      if (res.status >= 400) throw toApiError(res.status, res.body);
      let w;
      try {
        w = wireSessionExchange(res.body);
      } catch (err) {
        if (err instanceof DecodeError) {
          throw new ApiError('contract_mismatch', res.status, `POST exchange: ${err.message}`);
        }
        throw err;
      }
      csrfToken = w.csrf_token;
      session = {
        mode,
        permissions: DEMO_PERMISSIONS,
        idleTimeoutS: w.idle_timeout_s,
        absoluteTimeoutS: w.absolute_timeout_s,
      };
      return session;
    },
    onSessionEnded(listener) {
      endedListeners.add(listener);
      return () => endedListeners.delete(listener);
    },
    audioSrc: (callId) =>
      options.audioSrc
        ? options.audioSrc(callId)
        : `${apiConfig.baseUrl.replace(/\/$/, '')}${endpoints.callAudio(callId)}`,
    listAgents: ({ includeRetired = false } = {}) =>
      send(
        {
          method: 'GET',
          path: endpoints.agents,
          query: { include_retired: includeRetired ? 'true' : undefined },
        },
        agents.decoder,
        agents.map,
      ),
    createAgent: (input) =>
      send(
        { method: 'POST', path: endpoints.agents, body: agentInputToWire(input, requestId()) },
        wireAgent,
        agentFromWire,
      ),
    retireAgent: (id) =>
      send(
        { method: 'POST', path: endpoints.agentRetire(id), body: { request_id: requestId() } },
        wireAgent,
        agentFromWire,
      ),
    listCalls: (filter = {}) =>
      send(
        {
          method: 'GET',
          path: endpoints.calls,
          query: {
            agent_id: filter.agentId,
            include_hidden: filter.includeHidden ? 'true' : undefined,
          },
        },
        calls.decoder,
        calls.map,
      ),
    getCall: (id) => send({ method: 'GET', path: endpoints.call(id) }, wireCall, callFromWire),
    hideCall: (id, reason) => {
      const text = reason?.trim();
      return send(
        {
          method: 'DELETE',
          path: endpoints.call(id),
          body: text ? { request_id: requestId(), reason: text } : { request_id: requestId() },
        },
        wireCall,
        callFromWire,
      );
    },
    restoreCall: (id) =>
      send(
        { method: 'POST', path: endpoints.callRestore(id), body: { request_id: requestId() } },
        wireCall,
        callFromWire,
      ),
    uploadCall: ({ file, displayName, agentId, channelMap }) => {
      const form = new FormData();
      form.append('file', file);
      // Field names PROPOSED (contract v0.2 item 1). The agent is sent by stable id only;
      // its display name never goes to the server as an identifier.
      form.append('agent_id', agentId);
      if (displayName.trim()) form.append('display_name', displayName.trim());
      if (channelMap) form.append('channel_map', channelMap);
      form.append('request_id', requestId());
      return send(
        { method: 'POST', path: endpoints.calls, body: form },
        wireUploadAccepted,
        uploadAcceptedFromWire,
      );
    },
    getTranscript: (revisionId) =>
      send(
        { method: 'GET', path: endpoints.transcriptSegments(revisionId) },
        wireTranscript,
        transcriptFromWire,
      ),
    listRunHistory: (callId) =>
      send({ method: 'GET', path: endpoints.callEvaluations(callId) }, runs.decoder, runs.map),
    getRun: (runId) =>
      send(
        { method: 'GET', path: endpoints.evaluation(runId) },
        wireEvaluation,
        evaluationFromWire,
      ),
    listTranscriptRevisions: (callId) =>
      send(
        { method: 'GET', path: endpoints.callTranscripts(callId) },
        revisions.decoder,
        revisions.map,
      ),
    rescoreCall: (callId) =>
      send(
        { method: 'POST', path: endpoints.rescore(callId), body: { request_id: requestId() } },
        wireEvaluation,
        evaluationFromWire,
      ),
    // The contract defines no active-version field or route yet; return the newest saved
    // version and let the UI say so (never "active" without authoritative information).
    getActiveScorecardVersion: async () => {
      const all = await send(
        { method: 'GET', path: endpoints.scorecardVersions },
        versions.decoder,
        versions.map,
      );
      const active = all.filter((v) => v.status === 'active');
      if (active.length !== 1) {
        throw new ApiError('contract_mismatch', 200, 'Expected exactly one active version');
      }
      return active[0] as ScorecardVersion;
    },
    getDashboard: ({ scorecardVersionId, agentId }) =>
      send(
        {
          method: 'GET',
          path: endpoints.dashboard,
          query: {
            scope: scorecardVersionId ? 'version' : 'all_versions',
            scorecard_version_id: scorecardVersionId ?? undefined,
            agent_id: agentId ?? undefined,
          },
        },
        wireDashboard,
        dashboardFromWire,
      ),
    getLatestScorecardVersion: async () => {
      const all = await send(
        { method: 'GET', path: endpoints.scorecardVersions },
        versions.decoder,
        versions.map,
      );
      const newest = all.reduce<ScorecardVersion | undefined>(
        (a, b) => (!a || b.version > a.version ? b : a),
        undefined,
      );
      if (!newest) throw new ApiError('not_found', 404, 'No scorecard version');
      return newest;
    },
    listScorecardVersions: () =>
      send({ method: 'GET', path: endpoints.scorecardVersions }, versions.decoder, versions.map),
    // "Save and Activate": store the draft, then activate it as a new immutable version.
    // Route names PROPOSED (contract v0.2 item D); field errors arrive with the activation.
    saveScorecardVersion: async (draft) => {
      await send(
        { method: 'PUT', path: endpoints.scorecardDraft, body: scorecardDraftToWire(draft) },
        (v) => v,
        () => undefined,
      );
      return send(
        { method: 'POST', path: endpoints.scorecardActivate, body: { request_id: requestId() } },
        wireScorecardVersion,
        scorecardFromWire,
      );
    },
  };
}
