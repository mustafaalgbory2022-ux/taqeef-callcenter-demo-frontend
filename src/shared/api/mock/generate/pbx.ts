import type { WireAgent, WireQueue } from '../types';
import { DATA_END, DATA_START, eachDate, prng, weekday } from './random';

export interface WireQueueDaily {
  date: string;
  queue_id: string;
  incoming: number;
  answered: number;
  missed: number;
  abandoned: number;
  total_wait_s: number;
  max_wait_s: number;
  total_talk_s: number;
}

export interface WireAgentDaily {
  date: string;
  agent_id: string;
  queue_id: string;
  answered: number;
  missed: number;
  total_talk_s: number;
}

const BASE_VOLUME: Record<string, number> = { 'q-6001': 24, 'q-6002': 38 };
const DAY_FACTOR = [1, 1, 1.05, 1, 0.95, 0.25, 0.7]; // Sun … Sat (Friday weekend)

/**
 * SYNTHETIC Yeastar-style daily statistics. Missed (ring-no-answer) and abandoned (caller
 * hung up while waiting) are generated independently and never merged.
 */
export function generatePbx(queues: readonly WireQueue[], agents: readonly WireAgent[]) {
  const rand = prng('pbx-v1');
  const queueDaily: WireQueueDaily[] = [];
  const agentDaily: WireAgentDaily[] = [];
  for (const date of eachDate(DATA_START, DATA_END)) {
    for (const q of queues) {
      const base = (BASE_VOLUME[q.id] ?? 20) * (DAY_FACTOR[weekday(date)] ?? 1);
      const incoming = Math.max(0, Math.round(base * (0.8 + rand() * 0.4)));
      const missed = Math.round(incoming * (0.02 + rand() * 0.06));
      const abandoned = Math.round(incoming * (0.02 + rand() * 0.07));
      const answered = Math.max(0, incoming - missed - abandoned);
      const avgWait = 12 + rand() * 40;
      const avgTalk = 150 + rand() * 120;
      queueDaily.push({
        date,
        queue_id: q.id,
        incoming,
        answered,
        missed,
        abandoned,
        total_wait_s: Math.round(avgWait * incoming),
        max_wait_s: Math.round(avgWait * (2 + rand() * 3)),
        total_talk_s: Math.round(avgTalk * answered),
      });
      const members = agents.filter((a) => a.queue_ids.includes(q.id));
      let remainingAnswered = answered;
      let remainingMissed = missed;
      members.forEach((a, i) => {
        const last = i === members.length - 1;
        const share = last ? 1 : 1 / (members.length - i);
        const ans = last
          ? remainingAnswered
          : Math.round(remainingAnswered * share * (0.85 + rand() * 0.3));
        const mis = last
          ? remainingMissed
          : Math.min(remainingMissed, Math.round(remainingMissed * share));
        remainingAnswered -= ans;
        remainingMissed -= mis;
        agentDaily.push({
          date,
          agent_id: a.id,
          queue_id: q.id,
          answered: ans,
          missed: mis,
          total_talk_s: Math.round(ans * avgTalk * (0.85 + rand() * 0.3)),
        });
      });
    }
  }
  return { queueDaily, agentDaily };
}
