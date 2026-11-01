import { addDays, daysInRange, ISO_DATE, periodRange, todayISO } from '@/shared/utils/dates';
import {
  CALLS_PER_AGENT_RANGE,
  differsFromApproved,
  MAX_REPORT_DAYS,
  MIN_DURATION_RANGE,
} from '@/shared/utils/reportRules';
import { ACTOR, recordAudit } from '../audit';
import type { WireReportSettings } from '../fixtures/reports';
import { nextId } from '../db';
import { created, fail, invalid, ok, type Route } from '../router';
import type { MockState, WireReport } from '../types';
import { recordReportDelivery } from './notifications';
import { drawSample } from './operations';

const whole = (v: unknown, [min, max]: readonly [number, number]) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

export function reportSettingsRoutes(state: MockState, persist: () => void): Route[] {
  const s = () => state.reportSettings;
  const known = (ids: unknown, list: readonly { id: string }[]) =>
    Array.isArray(ids) && ids.every((id) => list.some((x) => x.id === id));

  return [
    { method: 'GET', pattern: '/reports/settings', handler: () => ok(s()) },
    {
      method: 'PUT',
      pattern: '/reports/settings',
      handler: ({ body }) => {
        const b = (body ?? {}) as Record<string, unknown>;
        if (b.automatic_scheduling === true && !s().scheduling_authorized)
          return fail(403, 'Automatic report scheduling is not authorized.');
        if (!whole(b.calls_per_agent, CALLS_PER_AGENT_RANGE))
          return invalid('calls_per_agent', 'Calls per agent must be a whole number from 1 to 20.');
        if (!whole(b.min_duration_s, MIN_DURATION_RANGE))
          return invalid('min_duration_s', 'Minimum duration must be 30–600 seconds.');
        if (
          !known(b.default_queue_ids, state.queues) ||
          (b.default_queue_ids as unknown[]).length === 0
        )
          return invalid('default_queue_ids', 'Select at least one known queue.');
        if (b.agent_selection !== 'all_active' && b.agent_selection !== 'selected')
          return invalid('agent_selection', 'Invalid agent selection.');
        if (
          b.agent_selection === 'selected' &&
          (!known(b.default_agent_ids, state.agents) ||
            (b.default_agent_ids as unknown[]).length === 0)
        )
          return invalid('default_agent_ids', 'Select at least one agent.');
        if (b.delivery !== 'download_only' && b.delivery !== 'email_on_generate')
          return invalid('delivery', 'Invalid delivery option.');
        const note = typeof b.change_note === 'string' ? b.change_note.trim() : '';
        if (note.length < 3) return invalid('change_note', 'Describe the change.');
        const before = { ...s() };
        const next: WireReportSettings = {
          ...before,
          calls_per_agent: b.calls_per_agent as number,
          min_duration_s: b.min_duration_s as number,
          default_queue_ids: (b.default_queue_ids as string[]).slice(),
          agent_selection: b.agent_selection,
          default_agent_ids:
            b.agent_selection === 'selected' ? (b.default_agent_ids as string[]).slice() : [],
          delivery: b.delivery,
          automatic_scheduling: false,
          version: before.version + 1,
          updated_at: new Date().toISOString(),
          updated_by: ACTOR,
        };
        const keys = [
          'calls_per_agent',
          'min_duration_s',
          'default_queue_ids',
          'agent_selection',
          'default_agent_ids',
          'delivery',
        ] as const;
        const changes = keys.flatMap((k) =>
          String(before[k]) === String(next[k])
            ? []
            : [{ field: k, before: String(before[k]), after: String(next[k]) }],
        );
        if (changes.length === 0) return fail(409, 'No changes compared with the current version.');
        state.reportSettings = next;
        recordAudit(state, {
          resource: 'report_settings',
          resourceId: `v${next.version}`,
          action: 'version_saved',
          summary: `Report settings v${next.version}: ${note}${differsFromApproved(next.calls_per_agent, next.min_duration_s) ? ' (differs from the approved 5 × ≥ 60 s policy)' : ''}`,
          changes,
        });
        persist();
        return ok(next);
      },
    },
    {
      method: 'POST',
      pattern: '/reports/generate',
      handler: ({ body }) => {
        const b = (body ?? {}) as Record<string, unknown>;
        const period = b.period === 'weekly' || b.period === 'custom' ? b.period : null;
        if (!period) return invalid('period', 'Choose weekly or custom.');
        const from = String(b.from ?? '');
        const to = String(b.to ?? '');
        if (!ISO_DATE.test(from) || !ISO_DATE.test(to) || from > to)
          return invalid('from', 'Choose a valid date range.');
        if (to > todayISO()) return invalid('to', 'The range cannot end in the future.');
        if (period === 'weekly') {
          const week = periodRange('weekly', from);
          if (week.from !== from || week.to !== to)
            return invalid('from', 'A weekly report covers one Saturday–Friday week.');
        } else if (daysInRange({ from, to }) > MAX_REPORT_DAYS) {
          return invalid('to', `A report covers at most ${MAX_REPORT_DAYS} days.`);
        }
        if (!known(b.queue_ids, state.queues) || (b.queue_ids as unknown[]).length === 0)
          return invalid('queue_ids', 'Select at least one queue.');
        if (!known(b.agent_ids, state.agents) || (b.agent_ids as unknown[]).length === 0)
          return invalid('agent_ids', 'Select at least one agent.');
        const cfg = s();
        const report: WireReport = {
          id: nextId(state, 'RPT'),
          title: `${period === 'weekly' ? 'Weekly' : 'Custom'} report ${from} – ${to}`,
          period,
          from,
          to,
          queue_ids: (b.queue_ids as string[]).slice(),
          agent_ids: (b.agent_ids as string[]).slice(),
          created_at: new Date().toISOString(),
          created_by: ACTOR,
          email_status: 'not_sent',
          simulated: true,
        };
        const sample = drawSample(
          state,
          report.agent_ids,
          from,
          to,
          cfg.calls_per_agent,
          cfg.min_duration_s * 1000,
        );
        state.reports.push(report);
        let delivery = null;
        if (b.deliver === true) {
          report.email_status = 'simulated_sent';
          delivery = recordReportDelivery(state, report.id, report.title, `${from} – ${to}`);
        }
        recordAudit(state, {
          resource: 'report_run',
          resourceId: report.id,
          action: 'generated',
          summary: `${report.title}: ${report.agent_ids.length} agents, sample seed ${sample.seed}${delivery ? ', email recorded (simulated)' : ''}`,
        });
        persist();
        return created({ report, sample, delivery, settings_version: cfg.version });
      },
    },
  ];
}

export const lastCompleteWeek = (today = todayISO()) => periodRange('weekly', addDays(today, -7));
