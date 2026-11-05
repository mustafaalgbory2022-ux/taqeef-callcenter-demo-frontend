import type {
  Agent,
  AgentInput,
  AuditEntry,
  Call,
  CallUpload,
  Evaluation,
  ScorecardDraft,
  ScorecardVersion,
  Session,
  Transcript,
  UploadAccepted,
} from '@/shared/types/domain';
import { apiConfig, type ApiMode } from './config';
import { arrayOf, DecodeError, type Decoder } from './decode';
import { endpoints } from './endpoints';
import { ApiError, toApiError } from './errors';
import type { ApiRequest, Transport } from './transport';
import {
  agentFromWire,
  agentInputToWire,
  auditFromWire,
  wireAgent,
  wireAuditEntry,
} from './wire/agents';
import {
  callFromWire,
  transcriptFromWire,
  uploadAcceptedFromWire,
  wireCall,
  wireTranscript,
  wireUploadAccepted,
} from './wire/calls';
import { evaluationFromWire, wireEvaluation } from './wire/evaluations';
import { scorecardDraftToWire, scorecardFromWire, wireScorecardVersion } from './wire/scorecards';
import { wireSessionExchange } from './wire/session';

export interface CallFilter {
  agentId?: string | undefined;
}

export interface EvaluationFilter {
  callId?: string | undefined;
  agentId?: string | undefined;
}

/** The only data-access surface for UI code. Returns domain types; throws ApiError. */
export interface ApiClient {
  readonly mode: ApiMode;
  /** The session held in memory, or null (a reload always needs a new launch code). */
  getSession(): Promise<Session | null>;
  /** Exchange a one-time launch code; keeps the returned CSRF token in memory only. */
  openSession(launchCode: string): Promise<Session>;
  /** Called once whenever the backend ends the session (any 401). Returns an unsubscribe. */
  onSessionEnded(listener: () => void): () => void;
  /** Playback source for a call: the protected audio route (cookie, same-origin, no CSRF). */
  audioSrc(callId: string): string | null;
  listAgents(): Promise<Agent[]>;
  createAgent(input: AgentInput): Promise<Agent>;
  updateAgent(id: string, patch: Partial<AgentInput>): Promise<Agent>;
  getAgentHistory(id: string): Promise<AuditEntry[]>;
  listCalls(filter?: CallFilter): Promise<Call[]>;
  getCall(id: string): Promise<Call>;
  uploadCall(upload: CallUpload): Promise<UploadAccepted>;
  /** One immutable transcript revision. */
  getTranscript(revisionId: string): Promise<Transcript>;
  listEvaluations(filter?: EvaluationFilter): Promise<Evaluation[]>;
  rescoreCall(callId: string): Promise<Evaluation>;
  getCurrentScorecard(): Promise<ScorecardVersion>;
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

  const list = <W, T>(decoder: Decoder<W>, map: (w: W) => T) => ({
    decoder: arrayOf(decoder),
    map: (ws: W[]) => ws.map(map),
  });

  const agents = list(wireAgent, agentFromWire);
  const calls = list(wireCall, callFromWire);
  const evaluations = list(wireEvaluation, evaluationFromWire);
  const versions = list(wireScorecardVersion, scorecardFromWire);
  const audit = list(wireAuditEntry, auditFromWire);

  return {
    mode,
    getSession: () => Promise.resolve(session),
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
    listCalls: (filter = {}) =>
      send(
        { method: 'GET', path: endpoints.calls, query: { agent_id: filter.agentId } },
        calls.decoder,
        calls.map,
      ),
    getCall: (id) => send({ method: 'GET', path: endpoints.call(id) }, wireCall, callFromWire),
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
    listEvaluations: (filter = {}) =>
      send(
        {
          method: 'GET',
          path: endpoints.evaluations,
          query: { call_id: filter.callId, agent_id: filter.agentId },
        },
        evaluations.decoder,
        evaluations.map,
      ),
    rescoreCall: (callId) =>
      send(
        { method: 'POST', path: endpoints.rescore(callId), body: { request_id: requestId() } },
        wireEvaluation,
        evaluationFromWire,
      ),
    // PROVISIONAL: the contract has no "current version" route and no active flag yet. In
    // the demo a version is only created by activation, so the newest version is the active one.
    getCurrentScorecard: async () => {
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
