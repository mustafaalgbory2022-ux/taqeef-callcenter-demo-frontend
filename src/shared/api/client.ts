import type {
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
import { arrayOf, DecodeError, type Decoder } from './decode';
import { endpoints } from './endpoints';
import { ApiError, toApiError } from './errors';
import type { ApiRequest, Transport } from './transport';
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
import { callFromWire, transcriptFromWire, wireCall, wireTranscript } from './wire/calls';
import { evaluationFromWire, wireEvaluation } from './wire/evaluations';
import { scorecardDraftToWire, scorecardFromWire, wireScorecardVersion } from './wire/scorecards';
import { sessionFromWire, wireSession } from './wire/session';

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
  getSession(): Promise<Session | null>;
  openSession(launchCode: string): Promise<Session>;
  getBranding(): Promise<Branding>;
  listQueues(): Promise<Queue[]>;
  listAgents(): Promise<Agent[]>;
  createAgent(input: AgentInput): Promise<Agent>;
  updateAgent(id: string, patch: Partial<AgentInput>): Promise<Agent>;
  getAgentHistory(id: string): Promise<AuditEntry[]>;
  listCalls(filter?: CallFilter): Promise<Call[]>;
  getCall(id: string): Promise<Call>;
  uploadCall(upload: CallUpload): Promise<Call>;
  getTranscript(callId: string): Promise<Transcript>;
  listEvaluations(filter?: EvaluationFilter): Promise<Evaluation[]>;
  rescoreCall(callId: string): Promise<Evaluation>;
  getCurrentScorecard(): Promise<ScorecardVersion>;
  listScorecardVersions(): Promise<ScorecardVersion[]>;
  saveScorecardVersion(draft: ScorecardDraft): Promise<ScorecardVersion>;
}

export function createApiClient(transport: Transport, mode: ApiMode): ApiClient {
  async function send<W, T>(req: ApiRequest, decoder: Decoder<W>, map: (w: W) => T): Promise<T> {
    const res = await transport(req);
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
  const queues = list(wireQueue, queueFromWire);
  const audit = list(wireAuditEntry, auditFromWire);

  return {
    mode,
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
    listCalls: (filter = {}) =>
      send(
        { method: 'GET', path: endpoints.calls, query: { agent_id: filter.agentId } },
        calls.decoder,
        calls.map,
      ),
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
          query: { call_id: filter.callId, agent_id: filter.agentId },
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
