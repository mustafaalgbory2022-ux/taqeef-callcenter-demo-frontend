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
  queue: (id: string) => `/queues/${seg(id)}`,
  queueAgents: (id: string) => `/queues/${seg(id)}/agents`,
  adminAudit: '/admin/audit',
  aiModels: '/ai/models',
  aiStatus: '/ai/status',
  aiConfigCurrent: '/ai/config/current',
  aiConfigVersions: '/ai/config/versions',
  aiJobs: '/ai/jobs',
  aiJobsPause: '/ai/jobs/pause',
  aiJobsResume: '/ai/jobs/resume',
  aiJobRetry: (id: string) => `/ai/jobs/${seg(id)}/retry`,
  aiJobCancel: (id: string) => `/ai/jobs/${seg(id)}/cancel`,
  agents: '/agents',
  agent: (id: string) => `/agents/${seg(id)}`,
  agentHistory: (id: string) => `/agents/${seg(id)}/history`,
  calls: '/calls',
  call: (id: string) => `/calls/${seg(id)}`,
  transcript: (id: string) => `/calls/${seg(id)}/transcript`,
  callReview: (id: string) => `/calls/${seg(id)}/review`,
  pbxMetrics: '/pbx/metrics',
  liveStatus: '/live/status',
  insights: '/insights/classifications',
  reports: '/reports',
  reportEmail: (id: string) => `/reports/${seg(id)}/email`,
  audioSample: '/reports/audio-sample',
  rescore: (id: string) => `/calls/${seg(id)}/rescore`,
  evaluations: '/evaluations',
  scorecardCurrent: '/scorecards/current',
  scorecardVersions: '/scorecards/versions',
} as const;
