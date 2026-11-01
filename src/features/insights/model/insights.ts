import type { CallReason, InsightRow } from '@/shared/types/domain';

export interface ReasonSummary {
  reason: CallReason;
  calls: number;
  complaints: number;
  serviceRequests: number;
}

export interface InsightSummary {
  total: number;
  complaints: number;
  serviceRequests: number;
  byReason: ReasonSummary[];
  /** Complaints per period key (e.g. reporting week). */
  complaintTrend: { period: string; complaints: number; calls: number }[];
}

/** Aggregate classified calls; reasons sorted by volume (a breakdown, not an agent ranking). */
export function summarizeInsights(
  rows: readonly InsightRow[],
  periodOf: (date: string) => string,
): InsightSummary {
  const byReason = new Map<CallReason, ReasonSummary>();
  const trend = new Map<string, { complaints: number; calls: number }>();
  for (const r of rows) {
    const s = byReason.get(r.reason) ?? {
      reason: r.reason,
      calls: 0,
      complaints: 0,
      serviceRequests: 0,
    };
    s.calls += 1;
    if (r.complaint) s.complaints += 1;
    if (r.serviceRequest) s.serviceRequests += 1;
    byReason.set(r.reason, s);
    const key = periodOf(r.recordedAt.slice(0, 10));
    const tr = trend.get(key) ?? { complaints: 0, calls: 0 };
    tr.calls += 1;
    if (r.complaint) tr.complaints += 1;
    trend.set(key, tr);
  }
  return {
    total: rows.length,
    complaints: rows.filter((r) => r.complaint).length,
    serviceRequests: rows.filter((r) => r.serviceRequest).length,
    byReason: [...byReason.values()].sort(
      (a, b) => b.calls - a.calls || a.reason.localeCompare(b.reason),
    ),
    complaintTrend: [...trend.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, v]) => ({ period, ...v })),
  };
}
