/**
 * Endpoint map — the only place backend paths are written (relative to `apiConfig.baseUrl`).
 * CONFIRMED (demo API contract 1.2, 1.10): `sessionExchange`, `callAudio`.
 * PROPOSED, not frozen (contract §5): every other route; `transcriptSegments` follows the
 * proposed `GET /api/transcripts/{revision_id}/segments`.
 * To be removed (v0.2 change list item 11, pending UI follow-up): `branding`, `queues`.
 */
const seg = encodeURIComponent;

export const endpoints = {
  sessionExchange: '/session/exchange',
  branding: '/branding',
  queues: '/queues',
  agents: '/agents',
  agent: (id: string) => `/agents/${seg(id)}`,
  agentHistory: (id: string) => `/agents/${seg(id)}/history`,
  calls: '/calls',
  call: (id: string) => `/calls/${seg(id)}`,
  callAudio: (id: string) => `/calls/${seg(id)}/audio`,
  transcriptSegments: (revisionId: string) => `/transcripts/${seg(revisionId)}/segments`,
  rescore: (id: string) => `/calls/${seg(id)}/rescore`,
  evaluations: '/evaluations',
  scorecardCurrent: '/scorecards/current',
  scorecardVersions: '/scorecards/versions',
} as const;
