import type { WireAgent, WireQueue } from '../types';
import { hashSeed, maskedNumber, prng } from './random';

/**
 * SIMULATED live view derived from the clock, so successive polls evolve smoothly:
 * each agent cycles through calls of a fixed synthetic length.
 */
export function generateLiveStatus(
  nowMs: number,
  queues: readonly WireQueue[],
  agents: readonly WireAgent[],
) {
  const nowS = Math.floor(nowMs / 1000);
  const active = agents.filter((a) => a.status === 'active');
  const agentRows = active.map((a) => {
    const cycle = 180 + (hashSeed(a.id) % 240);
    const pos = (nowS + (hashSeed(`${a.id}-offset`) % cycle)) % cycle;
    const callNo = Math.floor((nowS + (hashSeed(`${a.id}-offset`) % cycle)) / cycle);
    const state =
      pos < cycle * 0.62
        ? 'on_call'
        : pos < cycle * 0.68
          ? 'ringing'
          : pos < cycle * 0.9
            ? 'available'
            : 'paused';
    const since =
      state === 'on_call'
        ? pos
        : state === 'ringing'
          ? pos - cycle * 0.62
          : state === 'available'
            ? pos - cycle * 0.68
            : pos - cycle * 0.9;
    return { agent: a, state, since: Math.max(0, Math.round(since)), callNo };
  });
  const rand = prng(Math.floor(nowS / 15));
  const waitingByQueue = new Map(queues.map((q) => [q.id, Math.floor(rand() * 4)]));

  const calls = [
    ...agentRows
      .filter((r) => r.state === 'on_call' || r.state === 'ringing')
      .map((r) => ({
        id: `LIVE-${r.agent.id}-${r.callNo}`,
        queue_id:
          r.agent.queue_ids[r.callNo % Math.max(1, r.agent.queue_ids.length)] ??
          queues[0]?.id ??
          '',
        agent_id: r.agent.id,
        state: r.state === 'on_call' ? ('talking' as const) : ('ringing' as const),
        duration_s: r.since,
        caller_masked: maskedNumber(prng(`${r.agent.id}-${r.callNo}`)),
      })),
    ...queues.flatMap((q) =>
      Array.from({ length: waitingByQueue.get(q.id) ?? 0 }, (_, i) => ({
        id: `WAIT-${q.id}-${Math.floor(nowS / 15)}-${i}`,
        queue_id: q.id,
        agent_id: null,
        state: 'waiting' as const,
        duration_s: 5 + ((nowS + i * 17) % 70),
        caller_masked: maskedNumber(prng(`${q.id}-${Math.floor(nowS / 15)}-${i}`)),
      })),
    ),
  ];

  return {
    generated_at: new Date(nowMs).toISOString(),
    simulated: true,
    queues: queues.map((q) => {
      const waiting = calls.filter((c) => c.queue_id === q.id && c.state === 'waiting');
      return {
        queue_id: q.id,
        waiting: waiting.length,
        longest_wait_s: waiting.reduce((m, c) => Math.max(m, c.duration_s), 0),
        active_calls: calls.filter((c) => c.queue_id === q.id && c.state !== 'waiting').length,
        agents_available: agentRows.filter(
          (r) => r.state === 'available' && r.agent.queue_ids.includes(q.id),
        ).length,
      };
    }),
    agents: [
      ...agentRows.map((r) => ({
        agent_id: r.agent.id,
        state: r.state,
        since_s: r.since,
        queue_ids: r.agent.queue_ids,
      })),
      ...agents
        .filter((a) => a.status !== 'active')
        .map((a) => ({
          agent_id: a.id,
          state: 'offline' as const,
          since_s: 0,
          queue_ids: a.queue_ids,
        })),
    ],
    calls,
  };
}
