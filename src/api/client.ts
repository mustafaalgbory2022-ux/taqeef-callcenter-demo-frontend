import { env, type ApiMode } from '@/config/env';
import {
  CallListSchema,
  CallSchema,
  EvaluationListSchema,
  EvaluationSchema,
  ScorecardListSchema,
  ScorecardSchema,
  TranscriptSchema,
  type Call,
  type Evaluation,
  type RescoreRequest,
  type Scorecard,
  type Transcript,
} from './contract';
import { endpoints } from './endpoints';
import { createHttp, type HttpOptions } from './http';

/**
 * The only data-access surface UI code may use. Components never call fetch directly.
 * Mock mode is implemented at the network layer (MSW), so the same client code runs
 * against synthetic data and the real FastAPI backend.
 */
export interface ApiClient {
  readonly mode: ApiMode;
  listCalls(): Promise<Call[]>;
  getCall(id: string): Promise<Call>;
  uploadCall(file: File, meta: { title: string }): Promise<Call>;
  getTranscript(callId: string): Promise<Transcript>;
  listEvaluations(callId: string): Promise<Evaluation[]>;
  rescore(callId: string, request: RescoreRequest): Promise<Evaluation>;
  listScorecards(): Promise<Scorecard[]>;
  getScorecard(id: string): Promise<Scorecard>;
  saveScorecard(scorecard: Omit<Scorecard, 'version' | 'createdAt'>): Promise<Scorecard>;
}

export function createApiClient(mode: ApiMode, http: HttpOptions): ApiClient {
  const { request } = createHttp(http);
  const json = (method: string, body: unknown): RequestInit => ({
    method,
    body: JSON.stringify(body),
  });

  return {
    mode,
    listCalls: () => request(CallListSchema, endpoints.calls()),
    getCall: (id) => request(CallSchema, endpoints.call(id)),
    uploadCall: (file, meta) => {
      const form = new FormData();
      form.append('file', file);
      form.append('title', meta.title);
      return request(CallSchema, endpoints.callUpload(), { method: 'POST', body: form });
    },
    getTranscript: (callId) => request(TranscriptSchema, endpoints.transcript(callId)),
    listEvaluations: (callId) => request(EvaluationListSchema, endpoints.evaluations(callId)),
    rescore: (callId, req) =>
      request(EvaluationSchema, endpoints.rescore(callId), json('POST', req)),
    listScorecards: () => request(ScorecardListSchema, endpoints.scorecards()),
    getScorecard: (id) => request(ScorecardSchema, endpoints.scorecard(id)),
    saveScorecard: (sc) =>
      request(ScorecardSchema, endpoints.scorecardVersions(sc.id), json('POST', sc)),
  };
}

export const apiClient = createApiClient(env.VITE_API_MODE, { baseUrl: env.VITE_API_BASE_URL });
