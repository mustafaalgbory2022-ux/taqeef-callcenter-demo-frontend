/**
 * Endpoint map — the only place backend paths are written (relative to `apiConfig.baseUrl`).
 * CONFIRMED (demo API contract 1.2, 1.10): `sessionExchange`, `callAudio`.
 * The CSRF-header exemptions are exactly four (contract v0.2.1 §D): `sessionExchange`, health
 * (never called by the UI), the `callAudio` GET (sent by <audio>) and `GET session`.
 * PROPOSED, not frozen (contract §5): every other route; `transcriptSegments` follows the
 * proposed `GET /api/transcripts/{revision_id}/segments`.
 */
const seg = encodeURIComponent;

export const endpoints = {
  sessionExchange: '/session/exchange',
  /** Session resume after a reload (contract v0.2.1 §D, PROPOSED). CSRF-exempt. */
  session: '/session',
  agents: '/agents',
  agentRetire: (id: string) => `/agents/${seg(id)}/retire`,
  calls: '/calls',
  call: (id: string) => `/calls/${seg(id)}`,
  callAudio: (id: string) => `/calls/${seg(id)}/audio`,
  transcriptSegments: (revisionId: string) => `/transcripts/${seg(revisionId)}/segments`,
  rescore: (id: string) => `/calls/${seg(id)}/rescore`,
  evaluations: '/evaluations',
  /** Contract v0.3 route #38 (PROPOSED). */
  dashboard: '/dashboard',
  // Scorecard routes follow contract v0.1 §5 / v0.2 item D (PROPOSED); bodies are provisional.
  scorecardDraft: '/scorecard/draft',
  scorecardActivate: '/scorecard/activate',
  scorecardVersions: '/scorecard/versions',
} as const;
