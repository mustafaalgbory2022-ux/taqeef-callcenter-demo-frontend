/**
 * PROVISIONAL endpoint map — the only place backend paths are written.
 * Align with the confirmed FastAPI contract here (see docs/api-adapter.md).
 */
const seg = encodeURIComponent;

export const endpoints = {
  session: '/session',
  sessionLaunch: '/session/launch',
  branding: '/branding',
  queues: '/queues',
  agents: '/agents',
  agent: (id: string) => `/agents/${seg(id)}`,
  agentHistory: (id: string) => `/agents/${seg(id)}/history`,
  calls: '/calls',
  call: (id: string) => `/calls/${seg(id)}`,
  transcript: (id: string) => `/calls/${seg(id)}/transcript`,
  rescore: (id: string) => `/calls/${seg(id)}/rescore`,
  evaluations: '/evaluations',
  scorecardCurrent: '/scorecards/current',
  scorecardVersions: '/scorecards/versions',
} as const;
