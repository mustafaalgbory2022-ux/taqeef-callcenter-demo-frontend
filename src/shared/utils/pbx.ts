import type { AgentDailyStat, QueueDailyStat } from '@/shared/types/domain';

/**
 * PBX metric rules (approved). SLA % = (Total incoming − Missed) ÷ Total incoming × 100.
 * Missed and abandoned are separate figures: abandoned is never added to missed, and no
 * metric is estimated from recordings. With no incoming calls the SLA is "not available".
 */
export function slaPercent(incoming: number, missed: number): number | null {
  return incoming > 0 ? ((incoming - missed) / incoming) * 100 : null;
}

export interface QueueSummary {
  incoming: number;
  answered: number;
  missed: number;
  abandoned: number;
  slaPercent: number | null;
  avgWaitS: number | null;
  maxWaitS: number | null;
  avgTalkS: number | null;
  days: number;
}

export function summarizeQueue(rows: readonly QueueDailyStat[]): QueueSummary {
  const sum = (k: 'incoming' | 'answered' | 'missed' | 'abandoned' | 'totalWaitS' | 'totalTalkS') =>
    rows.reduce((s, r) => s + r[k], 0);
  const incoming = sum('incoming');
  const answered = sum('answered');
  const missed = sum('missed');
  return {
    incoming,
    answered,
    missed,
    abandoned: sum('abandoned'),
    slaPercent: slaPercent(incoming, missed),
    avgWaitS: incoming > 0 ? sum('totalWaitS') / incoming : null,
    maxWaitS: rows.length ? Math.max(...rows.map((r) => r.maxWaitS)) : null,
    avgTalkS: answered > 0 ? sum('totalTalkS') / answered : null,
    days: new Set(rows.map((r) => r.date)).size,
  };
}

export function groupBy<T, K extends string>(rows: readonly T[], key: (r: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const r of rows) map.set(key(r), [...(map.get(key(r)) ?? []), r]);
  return map;
}

/** One point per day: incoming volume and SLA %. */
export function dailySeries(rows: readonly QueueDailyStat[]) {
  return [...groupBy(rows, (r) => r.date).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, day]) => {
      const s = summarizeQueue(day);
      return { date, incoming: s.incoming, slaPercent: s.slaPercent };
    });
}

export interface AgentPbxSummary {
  answered: number;
  missed: number;
  avgTalkS: number | null;
}

/** Agent-level PBX figures. SLA is a queue-level metric and is not computed per agent. */
export function summarizeAgent(rows: readonly AgentDailyStat[]): AgentPbxSummary {
  const answered = rows.reduce((s, r) => s + r.answered, 0);
  const talk = rows.reduce((s, r) => s + r.totalTalkS, 0);
  return {
    answered,
    missed: rows.reduce((s, r) => s + r.missed, 0),
    avgTalkS: answered > 0 ? talk / answered : null,
  };
}
