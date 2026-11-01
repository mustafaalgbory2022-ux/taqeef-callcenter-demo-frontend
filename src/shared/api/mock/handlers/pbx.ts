import { addDays, daysInRange, ISO_DATE, todayISO } from '@/shared/utils/dates';
import {
  INGESTION_MIN_DATE,
  isHost,
  MAX_SYNC_DAYS,
  POLL_RANGE,
  PORT_RANGE,
} from '@/shared/utils/pbxRules';
import { recordAudit } from '../audit';
import { nextId } from '../db';
import type { WirePbxConnector, WirePbxSync } from '../fixtures/pbx';
import type { GeneratedData } from '../generate';
import { created, fail, invalid, ok, type Route } from '../router';
import type { MockState } from '../types';
import { callDate, inRange } from './callQueries';

const ACTOR = 'Synthetic administrator';

/** Server-side validation of the Yeastar P550 adapter settings (simulated backend adapter). */
function validateYeastar(settings: Record<string, unknown>) {
  const host = typeof settings.host === 'string' ? settings.host.trim() : '';
  if (!host) return invalid('host', 'Enter the PBX host name or IP address.');
  if (!isHost(host))
    return invalid('host', 'Enter a host name or IPv4 address without http:// or a path.');
  const port = settings.port;
  if (
    typeof port !== 'number' ||
    !Number.isInteger(port) ||
    port < PORT_RANGE[0] ||
    port > PORT_RANGE[1]
  )
    return invalid('port', 'Port must be between 1 and 65535.');
  const client = typeof settings.api_client_id === 'string' ? settings.api_client_id.trim() : '';
  if (!/^[A-Za-z0-9._-]{4,64}$/.test(client))
    return invalid(
      'api_client_id',
      'Enter the API client ID configured on the PBX (4–64 characters).',
    );
  if (typeof settings.use_tls !== 'boolean' || typeof settings.verify_certificate !== 'boolean')
    return invalid('use_tls', 'Invalid TLS settings.');
  return null;
}

const VENDOR_VALIDATORS: Record<
  string,
  (s: Record<string, unknown>) => ReturnType<typeof invalid> | null
> = {
  yeastar_p550: validateYeastar,
};

export function pbxRoutes(
  state: MockState,
  generated: GeneratedData,
  persist: () => void,
): Route[] {
  const find = (id: string | undefined) => state.pbx.connectors.find((c) => c.id === id);
  const syncs = (id: string) => (state.pbx.syncs[id] ??= []);
  const configured = (c: WirePbxConnector) => {
    const v = VENDOR_VALIDATORS[c.vendor];
    return Boolean(v && !v(c.settings) && c.credential_set);
  };
  const refreshState = (c: WirePbxConnector, message?: string) => {
    if (!configured(c)) {
      c.state = 'not_configured';
      c.state_message = message ?? 'Connection settings and the API credential are required.';
    } else if (!c.enabled) {
      c.state = 'disabled';
      c.state_message = message ?? 'Settings are complete. Ingestion is switched off.';
    } else {
      c.state = 'configured';
      c.state_message =
        message ?? 'Simulated: settings are valid; no PBX connection is made in the browser.';
    }
  };

  return [
    { method: 'GET', pattern: '/pbx/vendors', handler: () => ok(state.pbx.vendors) },
    { method: 'GET', pattern: '/pbx/connectors', handler: () => ok(state.pbx.connectors) },
    {
      method: 'PUT',
      pattern: '/pbx/connectors/:id',
      handler: ({ params, body }) => {
        const c = find(params.id);
        if (!c) return fail(404, 'Connector not found.');
        const b = (body ?? {}) as Record<string, unknown>;
        const name = typeof b.name === 'string' ? b.name.trim() : '';
        if (!name || name.length > 60)
          return invalid('name', 'Enter a name of up to 60 characters.');
        const settings = (
          typeof b.settings === 'object' && b.settings !== null ? b.settings : {}
        ) as Record<string, unknown>;
        const validator = VENDOR_VALIDATORS[c.vendor];
        if (!validator) return fail(409, 'No adapter is installed for this PBX vendor.');
        const error = validator(settings);
        if (error) return error;
        const queueIds = Array.isArray(b.queue_ids) ? b.queue_ids.map(String) : [];
        if (queueIds.length === 0)
          return invalid('queue_ids', 'Select at least one queue to ingest.');
        const known = new Map(state.queues.map((q) => [q.id, q]));
        if (queueIds.some((id) => !known.has(id))) return invalid('queue_ids', 'Unknown queue.');
        if (
          queueIds.some((id) => known.get(id)?.status === 'disabled' && !c.queue_ids.includes(id))
        )
          return invalid('queue_ids', 'Disabled queues cannot be added.');
        const start = String(b.ingestion_start_date ?? '');
        if (!ISO_DATE.test(start) || start < INGESTION_MIN_DATE || start > todayISO())
          return invalid(
            'ingestion_start_date',
            `Choose a date between ${INGESTION_MIN_DATE} and today.`,
          );
        const poll = b.poll_interval_minutes;
        if (
          typeof poll !== 'number' ||
          !Number.isInteger(poll) ||
          poll < POLL_RANGE[0] ||
          poll > POLL_RANGE[1]
        )
          return invalid('poll_interval_minutes', 'Polling interval must be 1–60 minutes.');
        if (start !== c.ingestion_start_date && b.confirm !== true)
          return fail(409, 'Changing the ingestion start date must be confirmed.');
        const removedQueues = c.queue_ids.filter((id: string) => !queueIds.includes(id));
        if (removedQueues.length > 0 && b.confirm !== true)
          return fail(409, 'Removing a queue from ingestion must be confirmed.');
        const secret = typeof b.secret === 'string' ? b.secret : '';
        if (secret && (secret.length < 8 || secret.length > 256))
          return invalid('secret', 'The API client secret must be 8–256 characters.');

        const before = { ...c, settings: { ...c.settings } };
        const now = new Date().toISOString();
        Object.assign(c, {
          name,
          settings: {
            host: String(settings.host).trim(),
            port: settings.port,
            use_tls: settings.use_tls,
            verify_certificate: settings.verify_certificate,
            api_client_id: String(settings.api_client_id).trim(),
          },
          queue_ids: queueIds,
          ingestion_start_date: start,
          poll_interval_minutes: poll,
          updated_at: now,
        });
        if (secret) {
          c.credential_set = true;
          c.credential_updated_at = now;
          recordAudit(state, {
            resource: 'pbx_connector',
            resourceId: c.id,
            action: 'credential_replaced',
            summary: 'API client secret replaced (value not recorded)',
          });
        }
        refreshState(c);
        const changes = [
          ...Object.keys(c.settings).flatMap((k) =>
            String(before.settings[k]) === String(c.settings[k])
              ? []
              : [
                  {
                    field: k,
                    before: String(before.settings[k] ?? ''),
                    after: String(c.settings[k]),
                  },
                ],
          ),
          ...(
            ['name', 'queue_ids', 'ingestion_start_date', 'poll_interval_minutes'] as const
          ).flatMap((k) =>
            String(before[k]) === String(c[k])
              ? []
              : [{ field: k, before: String(before[k]), after: String(c[k]) }],
          ),
        ];
        if (changes.length > 0)
          recordAudit(state, {
            resource: 'pbx_connector',
            resourceId: c.id,
            action: 'updated',
            summary: `${c.name} settings updated`,
            changes,
          });
        persist();
        return ok(c);
      },
    },
    {
      method: 'POST',
      pattern: '/pbx/connectors/:id/test',
      handler: ({ params }) => {
        const c = find(params.id);
        if (!c) return fail(404, 'Connector not found.');
        const settingsError = VENDOR_VALIDATORS[c.vendor]?.(c.settings);
        const steps = [
          {
            step: 'settings',
            result: settingsError ? 'failed' : 'passed',
            message: settingsError
              ? 'Connection settings are incomplete or invalid.'
              : 'Connection settings are valid.',
          },
          {
            step: 'credentials',
            result: c.credential_set ? 'passed' : 'failed',
            message: c.credential_set
              ? 'An API credential is stored.'
              : 'No API credential is stored.',
          },
          {
            step: 'network',
            result: 'skipped',
            message: 'Simulated backend: no network connection to a PBX was attempted.',
          },
          {
            step: 'queues',
            result: c.queue_ids.length ? 'passed' : 'failed',
            message: `Queues selected for ingestion: ${c.queue_ids.length}.`,
          },
        ] as const;
        const passed = steps.every((s) => s.result !== 'failed');
        c.checked_at = new Date().toISOString();
        if (passed) refreshState(c);
        else {
          c.state = configured(c) ? 'error' : 'not_configured';
          c.state_message = 'The last connection test failed. Review the steps below.';
        }
        recordAudit(state, {
          resource: 'pbx_connector',
          resourceId: c.id,
          action: 'tested',
          summary: passed
            ? 'Connection test passed (simulated)'
            : 'Connection test failed (simulated)',
        });
        persist();
        return ok({ ok: passed, simulated: true, checked_at: c.checked_at, steps });
      },
    },
    {
      method: 'PUT',
      pattern: '/pbx/connectors/:id/enabled',
      handler: ({ params, body }) => {
        const c = find(params.id);
        if (!c) return fail(404, 'Connector not found.');
        const b = (body ?? {}) as { enabled?: unknown; confirm?: unknown };
        if (typeof b.enabled !== 'boolean') return invalid('enabled', 'Invalid value.');
        if (b.confirm !== true) return fail(409, 'Changing ingestion must be confirmed.');
        if (b.enabled && !configured(c))
          return fail(
            409,
            'Complete the connection settings and credential before enabling ingestion.',
          );
        if (c.enabled === b.enabled) return ok(c);
        c.enabled = b.enabled;
        c.updated_at = new Date().toISOString();
        refreshState(c);
        recordAudit(state, {
          resource: 'pbx_connector',
          resourceId: c.id,
          action: b.enabled ? 'enabled' : 'disabled',
          summary: `Ingestion ${b.enabled ? 'enabled' : 'disabled'} for ${c.name}`,
        });
        persist();
        return ok(c);
      },
    },
    {
      method: 'GET',
      pattern: '/pbx/connectors/:id/syncs',
      handler: ({ params }) =>
        find(params.id) ? ok(syncs(params.id ?? '')) : fail(404, 'Connector not found.'),
    },
    {
      method: 'POST',
      pattern: '/pbx/connectors/:id/syncs',
      handler: ({ params, body }) => {
        const c = find(params.id);
        if (!c) return fail(404, 'Connector not found.');
        if (!c.enabled) return fail(409, 'Enable ingestion before starting a synchronization.');
        const b = (body ?? {}) as { from?: unknown; to?: unknown };
        const from = String(b.from ?? '');
        const to = String(b.to ?? '');
        if (!ISO_DATE.test(from) || !ISO_DATE.test(to) || from > to)
          return invalid('from', 'Choose a valid date range.');
        if (from < c.ingestion_start_date)
          return invalid(
            'from',
            `The range cannot start before the ingestion start date (${c.ingestion_start_date}).`,
          );
        if (to > todayISO()) return invalid('to', 'The range cannot end in the future.');
        if (daysInRange({ from, to }) > MAX_SYNC_DAYS)
          return invalid('to', `Synchronize at most ${MAX_SYNC_DAYS} days at a time.`);
        const queues = new Set(c.queue_ids);
        const calls = state.calls.filter(
          (x) =>
            x.source === 'pbx' &&
            x.queue_id !== null &&
            queues.has(x.queue_id) &&
            inRange(callDate(x), from, to),
        );
        const days = generated.queueDaily.filter(
          (d) => queues.has(d.queue_id) && inRange(d.date, from, to),
        );
        const now = new Date().toISOString();
        const run: WirePbxSync = {
          id: nextId(state, 'sync'),
          connector_id: c.id,
          trigger: 'manual',
          status: 'simulated',
          from,
          to,
          started_at: now,
          finished_at: now,
          cdr_records: calls.length,
          recordings: calls.filter((x) => x.audio_url !== null).length,
          queue_stat_days: days.length,
          message:
            'Simulated: synthetic records in this range were counted; nothing was imported from a PBX.',
          started_by: ACTOR,
        };
        syncs(c.id).unshift(run);
        c.last_sync = run;
        recordAudit(state, {
          resource: 'pbx_connector',
          resourceId: c.id,
          action: 'sync_started',
          summary: `Manual synchronization ${from} – ${to} (simulated)`,
        });
        persist();
        return created(run);
      },
    },
  ];
}

export const defaultSyncRange = (today = todayISO()) => ({ from: addDays(today, -6), to: today });
