import { seedAdminAudit } from './audit';
import { agents, initialAudit, queues } from './fixtures/agents';
import { aiModels, initialAiConfig, seedAiJobs } from './fixtures/ai';
import { initialConnector, pbxVendors } from './fixtures/pbx';
import { initialReportSettings } from './fixtures/reports';
import { initialStorageSettings, volumes } from './fixtures/storage';
import { initialBackupSettings } from './fixtures/backups';
import { initialPolicy, seedSecurityEvents, seedSessions, seedUsers } from './fixtures/users';
import { deliveries, initialSender, reportEmail, rules, templates } from './fixtures/notifications';
import { corrections, dictionaryEntries, initialVersions } from './fixtures/dictionary';
import { callFixtures } from './fixtures/calls';
import { scorecardVersions } from './fixtures/scorecards';
import { simulateEvaluation } from './scoring';
import type { MockState, WireScorecard } from './types';

const STORAGE_KEY = 'taqeef.mock.db.v5';

function versionOf(n: number): WireScorecard {
  const v = scorecardVersions.find((sc) => sc.version === n);
  if (!v) throw new Error(`Missing fixture scorecard v${n}`);
  return v;
}

/** Build the initial synthetic dataset, including evaluation history for DEMO-003. */
export function createSeedState(): MockState {
  const state: MockState = {
    queues: structuredClone(queues),
    agents: structuredClone(agents),
    audit: Object.fromEntries(agents.map((a) => [a.id, initialAudit(a)])),
    calls: callFixtures.map((f) => structuredClone(f.call)),
    transcripts: Object.fromEntries(
      callFixtures.map((f) => [f.call.id, { call_id: f.call.id, segments: f.segments }]),
    ),
    judgments: Object.fromEntries(callFixtures.map((f) => [f.call.id, f.judgments])),
    scorecards: structuredClone(scorecardVersions),
    evaluations: [],
    uploads: {},
    reviews: {},
    reports: [],
    adminAudit: [],
    ai: {
      models: structuredClone(aiModels),
      configs: [structuredClone(initialAiConfig)],
      jobs: seedAiJobs(Date.now()),
      paused: false,
      loadedAt: { transcription: 0, evaluation: 0 },
    },
    dictionary: {
      entries: structuredClone(dictionaryEntries),
      versions: Object.fromEntries(dictionaryEntries.map((e) => [e.id, initialVersions(e)])),
      corrections: structuredClone(corrections),
    },
    pbx: {
      vendors: structuredClone(pbxVendors),
      connectors: [structuredClone(initialConnector)],
      syncs: {},
    },
    notifications: {
      sender: structuredClone(initialSender),
      rules: structuredClone(rules),
      templates: structuredClone(templates),
      reportEmail: structuredClone(reportEmail),
      deliveries: structuredClone(deliveries),
    },
    reportSettings: structuredClone(initialReportSettings),
    security: {
      users: seedUsers(Date.now()),
      sessions: seedSessions(Date.now()),
      policy: structuredClone(initialPolicy),
      enrollment: null,
    },
    storage: {
      volumes: structuredClone(volumes),
      settings: structuredClone(initialStorageSettings),
      recovery: [],
    },
    backups: { settings: structuredClone(initialBackupSettings), runs: [], restores: [] },
    seq: 100,
  };
  state.adminAudit = [...seedSecurityEvents(Date.now()), ...seedAdminAudit(state)];

  callFixtures.forEach((f, i) => {
    const recorded = Date.parse(f.call.recorded_at);
    state.evaluations.push(
      simulateEvaluation({
        id: `ev-${String(i + 1).padStart(3, '0')}`,
        call: f.call,
        segments: f.segments,
        judgments: f.judgments,
        scorecard: versionOf(1),
        trigger: 'initial',
        supersedesId: null,
        createdAt: new Date(recorded + 15 * 60_000).toISOString(),
      }),
    );
  });

  const dispute = callFixtures.find((f) => f.call.id === 'DEMO-003');
  if (dispute) {
    state.evaluations.push(
      simulateEvaluation({
        id: 'ev-006',
        call: dispute.call,
        segments: dispute.segments,
        judgments: dispute.judgments,
        scorecard: versionOf(2),
        trigger: 'rescore',
        supersedesId: 'ev-003',
        createdAt: '2026-10-28T11:00:00+03:00',
      }),
    );
  }
  return state;
}

export function loadState(): MockState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // Fields added in later revisions fall back to the seed so older saved state still loads.
    if (raw) return { ...createSeedState(), ...(JSON.parse(raw) as Partial<MockState>) };
  } catch {
    /* storage unavailable or corrupt: fall back to seed */
  }
  return createSeedState();
}

/** Generated (deterministic) data is rebuilt on load and never persisted. */
const isGenerated = (id: string) => id.startsWith('C-') || id.startsWith('gev-');

export function saveState(state: MockState): void {
  const persistable: MockState = {
    ...state,
    calls: state.calls.filter((c) => c.source !== 'pbx'),
    evaluations: state.evaluations.filter((e) => !e.id.startsWith('gev-')),
    judgments: Object.fromEntries(
      Object.entries(state.judgments).filter(([id]) => !isGenerated(id)),
    ),
    transcripts: Object.fromEntries(
      Object.entries(state.transcripts).filter(([id]) => !isGenerated(id)),
    ),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  } catch {
    /* non-persistent session */
  }
}

export function clearSavedState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function nextId(state: MockState, prefix: string): string {
  state.seq += 1;
  return `${prefix}-${state.seq}`;
}
