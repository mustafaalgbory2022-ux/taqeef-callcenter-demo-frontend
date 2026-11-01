/**
 * PROVISIONAL endpoint map — the single place to align with the local FastAPI contract.
 * Paths are relative to VITE_API_BASE_URL. See docs/fastapi-adapter.md.
 */
const enc = encodeURIComponent;

export const endpoints = {
  calls: () => '/calls',
  call: (id: string) => `/calls/${enc(id)}`,
  callUpload: () => '/calls',
  transcript: (callId: string) => `/calls/${enc(callId)}/transcript`,
  evaluations: (callId: string) => `/calls/${enc(callId)}/evaluations`,
  rescore: (callId: string) => `/calls/${enc(callId)}/evaluations`,
  scorecards: () => '/scorecards',
  scorecard: (id: string) => `/scorecards/${enc(id)}`,
  scorecardVersions: (id: string) => `/scorecards/${enc(id)}/versions`,
} as const;
