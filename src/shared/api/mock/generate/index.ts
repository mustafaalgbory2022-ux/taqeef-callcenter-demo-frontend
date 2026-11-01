import { SEEDED_QUEUE_IDS } from '../fixtures/agents';
import { latestScorecard } from '../processing';
import { simulateEvaluation } from '../scoring';
import type { MockState } from '../types';
import { generateCalls, generatedTranscript } from './calls';
import { generatePbx, type WireAgentDaily, type WireQueueDaily } from './pbx';

export interface GeneratedData {
  queueDaily: WireQueueDaily[];
  agentDaily: WireAgentDaily[];
}

/**
 * Add the deterministic SYNTHETIC history (PBX statistics, ~280 PBX-ingested calls and their
 * evaluations) to the mutable mock state. It is rebuilt on every load and never persisted.
 */
export function addGeneratedData(state: MockState): GeneratedData {
  const pbx = generatePbx(
    state.queues.filter((q) => SEEDED_QUEUE_IDS.has(q.id)),
    state.agents.filter((a) => a.id.match(/^agt-00[1-4]$/)),
  );
  const { calls, judgments } = generateCalls(
    state.agents.filter((a) => a.id.match(/^agt-00[1-4]$/)),
  );
  const v1 = state.scorecards.find((v) => v.version === 1) ?? latestScorecard(state);
  const v2 = state.scorecards.find((v) => v.version === 2) ?? v1;
  for (const call of calls) {
    if (state.calls.some((c) => c.id === call.id)) continue;
    state.calls.push(call);
    state.judgments[call.id] = judgments[call.id] ?? [];
    const transcript = generatedTranscript(call);
    state.transcripts[call.id] = transcript;
    const created = new Date(Date.parse(call.recorded_at) + 20 * 60_000).toISOString();
    state.evaluations.push(
      simulateEvaluation({
        id: `gev-${call.id}`,
        call,
        segments: transcript.segments,
        judgments: judgments[call.id] ?? [],
        scorecard: call.recorded_at < '2026-10-27' ? v1 : v2,
        trigger: 'initial',
        supersedesId: null,
        createdAt: created,
      }),
    );
  }
  return { queueDaily: pbx.queueDaily, agentDaily: pbx.agentDaily };
}
