import { recordReportDelivery } from './notifications';
import type { GeneratedData } from '../generate';
import { generateLiveStatus } from '../generate/live';
import { prng } from '../generate/random';
import { nextId } from '../db';
import { created, fail, invalid, ok, type Route } from '../router';
import type { MockState, WireCall, WireReport } from '../types';
import { callDate, DEFAULT_REVIEW, inRange } from './callQueries';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
type Classified = WireCall & { classification: NonNullable<WireCall['classification']> };

/** SIMULATED PBX, live, insight and reporting endpoints (real backend: Yeastar + jobs). */
export function operationsRoutes(
  state: MockState,
  data: GeneratedData,
  persist: () => void,
): Route[] {
  return [
    {
      method: 'GET',
      pattern: '/pbx/metrics',
      handler: ({ query }) => {
        if (!query.from || !query.to || !DATE.test(query.from) || !DATE.test(query.to)) {
          return invalid('from', 'from and to (YYYY-MM-DD) are required.');
        }
        const keep = (r: { date: string; queue_id: string }) =>
          inRange(r.date, query.from, query.to) &&
          (!query.queue_id || r.queue_id === query.queue_id);
        return ok({
          simulated: true,
          queue_daily: data.queueDaily.filter(keep),
          agent_daily: data.agentDaily.filter(keep),
        });
      },
    },
    {
      method: 'GET',
      pattern: '/live/status',
      handler: () => ok(generateLiveStatus(Date.now(), state.queues, state.agents)),
    },
    {
      method: 'GET',
      pattern: '/insights/classifications',
      handler: ({ query }) =>
        ok(
          state.calls
            .filter(
              (c): c is Classified =>
                c.classification !== null && inRange(callDate(c), query.from, query.to),
            )
            .filter((c) => !query.queue_id || c.queue_id === query.queue_id)
            .filter((c) => !query.agent_id || c.agent_id === query.agent_id)
            .map((c) => ({
              call_id: c.id,
              recorded_at: c.recorded_at,
              queue_id: c.queue_id,
              agent_id: c.agent_id,
              reason: c.classification.reason,
              complaint: c.classification.complaint,
              service_request: c.classification.service_request,
            })),
        ),
    },
    {
      method: 'POST',
      pattern: '/reports/audio-sample',
      handler: ({ body }) => {
        const b = (body ?? {}) as {
          agent_ids?: string[];
          from?: string;
          to?: string;
          count?: number;
          min_duration_ms?: number;
        };
        if (!Array.isArray(b.agent_ids) || b.agent_ids.length === 0)
          return invalid('agent_ids', 'Select at least one agent.');
        const count = Math.min(20, Math.max(1, Number(b.count) || 5));
        const minMs = Math.max(0, Number(b.min_duration_ms) || 60_000);
        // Random per request; the seed is returned so a sample can be reproduced and audited.
        const seed = Math.random().toString(36).slice(2, 10);
        const rand = prng(seed);
        return ok({
          seed,
          simulated: true,
          agents: b.agent_ids.map((agentId) => {
            const eligible = state.calls.filter(
              (c) =>
                c.agent_id === agentId &&
                c.status === 'scored' &&
                (c.duration_ms ?? 0) >= minMs &&
                inRange(callDate(c), b.from, b.to),
            );
            const shuffled = [...eligible].sort(() => rand() - 0.5).slice(0, count);
            return {
              agent_id: agentId,
              requested: count,
              eligible: eligible.length,
              calls: shuffled.map((c) => ({ ...c, review: state.reviews[c.id] ?? DEFAULT_REVIEW })),
            };
          }),
        });
      },
    },
    { method: 'GET', pattern: '/reports', handler: () => ok([...state.reports].reverse()) },
    {
      method: 'POST',
      pattern: '/reports',
      handler: ({ body }) => {
        const b = (body ?? {}) as Partial<Record<keyof WireReport, unknown>>;
        if (typeof b.title !== 'string' || !b.title.trim())
          return invalid('title', 'Title is required.');
        if (
          typeof b.from !== 'string' ||
          typeof b.to !== 'string' ||
          !DATE.test(b.from) ||
          !DATE.test(b.to) ||
          b.from > b.to
        ) {
          return invalid('from', 'A valid date range is required.');
        }
        const report: WireReport = {
          id: nextId(state, 'RPT'),
          title: b.title.trim(),
          period:
            (['weekly', 'monthly', 'yearly', 'custom'] as const).find((p) => p === b.period) ??
            'custom',
          from: b.from,
          to: b.to,
          queue_ids: Array.isArray(b.queue_ids) ? b.queue_ids.map(String) : [],
          agent_ids: Array.isArray(b.agent_ids) ? b.agent_ids.map(String) : [],
          created_at: new Date().toISOString(),
          created_by: 'Synthetic administrator',
          email_status: 'not_sent',
          simulated: true,
        };
        state.reports.push(report);
        persist();
        return created(report);
      },
    },
    {
      method: 'POST',
      pattern: '/reports/:id/email',
      handler: ({ params }) => {
        const report = state.reports.find((r) => r.id === params.id);
        if (!report) return fail(404, 'Report not found.');
        // SIMULATED: nothing is sent. The real backend sends via the Microsoft 365 sender
        // using the management report email options; the delivery is recorded in history.
        report.email_status = 'simulated_sent';
        recordReportDelivery(state, report.id, report.title, `${report.from} – ${report.to}`);
        persist();
        return ok(report);
      },
    },
  ];
}
