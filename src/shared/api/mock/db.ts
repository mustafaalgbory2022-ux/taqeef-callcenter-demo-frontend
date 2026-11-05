import { agents, initialAudit } from './fixtures/agents';
import { callFixtures } from './fixtures/calls';
import { scorecardVersions } from './fixtures/scorecards';
import { syntheticRevisionId } from './ids';
import { simulateEvaluation } from './scoring';
import type { MockState, WireScorecard } from './types';

const STORAGE_KEY = 'taqeef.mock.db.v6';

function versionOf(n: number): WireScorecard {
  const v = scorecardVersions.find((sc) => sc.version === n);
  if (!v) throw new Error(`Missing fixture scorecard v${n}`);
  return v;
}

/** Build the initial synthetic dataset, including evaluation history for DEMO-003. */
export function createSeedState(): MockState {
  const state: MockState = {
    agents: structuredClone(agents),
    audit: Object.fromEntries(agents.map((a) => [a.id, initialAudit(a)])),
    calls: callFixtures.map((f, i) => ({
      ...structuredClone(f.call),
      current_transcript_revision_id: syntheticRevisionId(i + 1),
    })),
    transcripts: Object.fromEntries(
      callFixtures.map((f, i) => [
        f.call.id,
        {
          call_id: f.call.id,
          transcript_revision_id: syntheticRevisionId(i + 1),
          revision_no: 0,
          segments: f.segments,
        },
      ]),
    ),
    judgments: Object.fromEntries(callFixtures.map((f) => [f.call.id, f.judgments])),
    scorecards: structuredClone(scorecardVersions),
    revisions: [],
    evaluations: [],
    uploads: {},
    seq: 100,
  };

  callFixtures.forEach((f, i) => {
    const recorded = Date.parse(f.call.recorded_at);
    state.evaluations.push(
      simulateEvaluation({
        id: `ev-${String(i + 1).padStart(3, '0')}`,
        call: f.call,
        segments: f.segments,
        transcriptRevisionId: syntheticRevisionId(i + 1),
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
        transcriptRevisionId: syntheticRevisionId(callFixtures.indexOf(dispute) + 1),
        judgments: dispute.judgments,
        scorecard: versionOf(2),
        trigger: 'rescore',
        supersedesId: 'ev-003',
        createdAt: '2026-10-28T08:00:00.000Z',
      }),
    );
  }
  // DEMO-002 was re-transcribed after scoring: revision 1 is current but unscored, so the call
  // page must keep showing revision 0 with its run (contract v0.2 item 7).
  const retranscribed = state.transcripts['DEMO-002'];
  const call2 = state.calls.find((c) => c.id === 'DEMO-002');
  if (retranscribed && call2) {
    const rev1 = {
      ...structuredClone(retranscribed),
      transcript_revision_id: syntheticRevisionId(90),
      revision_no: 1,
    };
    state.revisions.push(rev1);
    call2.current_transcript_revision_id = rev1.transcript_revision_id;
  }

  // Each call's status reflects its latest run's explicit outcome (contract v0.2 item C).
  for (const call of state.calls) {
    const latest = state.evaluations
      .filter((e) => e.call_id === call.id)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
    if (latest) call.status = latest.outcome;
  }
  return state;
}

export function loadState(): MockState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MockState;
  } catch {
    /* storage unavailable or corrupt: fall back to seed */
  }
  return createSeedState();
}

export function saveState(state: MockState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
