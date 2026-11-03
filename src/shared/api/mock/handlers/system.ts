import type { Decoded } from '../../decode';
import type { wireSystemError } from '../../wire/system';
import { redactSensitive } from '@/shared/utils/redact';
import { ACTOR, recordAudit } from '../audit';
import { prng } from '../generate/random';
import { fail, ok, type Route } from '../router';
import type { MockState } from '../types';
import { storageOverview } from './storage';

export type WireSystemError = Decoded<typeof wireSystemError>;

/**
 * Synthetic error records. Some raw messages deliberately contain secret-like text: the
 * simulated backend sanitizes them before responding, as the production backend must.
 */
export function seedSystemErrors(now: number): WireSystemError[] {
  const at = (min: number) => new Date(now - min * 60_000).toISOString();
  const e = (
    i: number,
    severity: WireSystemError['severity'],
    service: WireSystemError['service'],
    code: string,
    message: string,
    min: number,
    count = 1,
  ): WireSystemError => ({
    id: `err-${i}`,
    at: at(min),
    severity,
    service,
    code,
    message,
    correlation_id: `cid-err-${String(i).padStart(4, '0')}`,
    count,
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
  });
  return [
    e(
      1,
      'error',
      'evaluation_worker',
      'EVAL_TIMEOUT',
      'Evaluation of C-1028-03 timed out after 30000 ms (job-5).',
      40,
    ),
    e(
      2,
      'error',
      'transcription_worker',
      'AUDIO_DECODE',
      'Audio of C-1027-14 could not be decoded (job-6, attempt 3).',
      90,
      3,
    ),
    e(
      3,
      'warning',
      'pbx_ingestion',
      'PBX_NOT_CONFIGURED',
      'PBX polling skipped: connector not configured.',
      15,
      24,
    ),
    e(
      4,
      'warning',
      'email_delivery',
      'SENDER_NOT_CONFIGURED',
      'Alert for DEMO-005 not sent to quality.supervisors@example.invalid: sender not configured.',
      60,
      2,
    ),
    e(
      5,
      'critical',
      'api',
      'AUTH_CONFIG',
      'Token refresh failed: client_secret=SYNTHETIC-NOT-REAL rejected by identity provider.',
      300,
    ),
    e(
      6,
      'warning',
      'api',
      'MFA_REJECTED',
      'TOTP code 482913 rejected for ops.viewer (5th attempt).',
      12,
    ),
  ];
}

const sanitize = (x: WireSystemError): WireSystemError => ({
  ...x,
  message: redactSensitive(x.message),
});

export function systemRoutes(state: MockState, persist: () => void): Route[] {
  const errors = () => state.system.errors;

  function health() {
    const now = Date.now();
    const rand = prng(String(Math.floor(now / 10_000)));
    const jobs = state.ai.jobs;
    const running = jobs.filter((j) => j.state === 'running');
    const queued = jobs.filter((j) => j.state === 'queued').length;
    const failed = jobs.filter((j) => j.state === 'failed').length;
    const pbx = state.pbx.connectors[0];
    const sender = state.notifications.sender;
    const dayAgo = new Date(now - 86_400_000).toISOString();
    const recent = state.notifications.deliveries.filter((d) => d.at >= dayAgo);
    const iso = new Date(now).toISOString();
    const svc = (
      id: WireSystemError['service'],
      s: 'healthy' | 'degraded' | 'down' | 'unknown',
      detail: string,
      latency: number | null,
    ) => ({ id, state: s, latency_ms: latency, detail, checked_at: iso });
    const workerState = state.ai.paused ? 'degraded' : failed > 0 ? 'degraded' : 'healthy';
    const services = [
      svc('api', 'healthy', 'Simulated API in the browser.', Math.round(20 + rand() * 40)),
      svc('database', 'healthy', 'Simulated: browser storage.', Math.round(2 + rand() * 6)),
      svc(
        'transcription_worker',
        workerState,
        state.ai.paused
          ? 'Queue paused by an administrator.'
          : `${failed} failed job(s) need attention.`,
        null,
      ),
      svc(
        'evaluation_worker',
        workerState,
        state.ai.paused ? 'Queue paused by an administrator.' : 'Simulated worker.',
        null,
      ),
      svc(
        'pbx_ingestion',
        !pbx || pbx.state === 'not_configured' ? 'down' : pbx.enabled ? 'healthy' : 'degraded',
        pbx?.state_message ?? 'No connector.',
        null,
      ),
      svc(
        'email_delivery',
        sender.state === 'not_configured' ? 'down' : 'healthy',
        sender.state_message,
        null,
      ),
      svc('scheduler', 'unknown', 'Simulated backend has no scheduler.', null),
    ];
    const overall = services.some((s) => s.state === 'down')
      ? 'degraded'
      : services.some((s) => s.state === 'degraded')
        ? 'degraded'
        : 'healthy';
    const disks = storageOverview(state).volumes.map((v) => ({
      volume_id: v.id,
      name: v.name,
      used_gb: v.used_gb,
      total_gb: v.total_gb,
      status: v.status,
    }));
    return {
      generated_at: iso,
      simulated: true,
      overall,
      services,
      resources: {
        cpu_pct: Math.round(18 + rand() * 30 + running.length * 12),
        ram_used_gb: Math.round((21 + rand() * 6) * 10) / 10,
        ram_total_gb: 64,
        gpus: [
          {
            id: 'gpu-0',
            name: 'Synthetic GPU 0 (24 GB)',
            util_pct: Math.min(100, Math.round(running.length * 35 + rand() * 15)),
            mem_used_gb: Math.round((9 + running.length * 4 + rand()) * 10) / 10,
            mem_total_gb: 24,
            temperature_c: Math.round(48 + running.length * 9 + rand() * 4),
          },
        ],
        disks,
      },
      workers: [
        {
          id: 'wrk-asr-1',
          kind: 'transcription',
          state: state.ai.paused
            ? 'stopped'
            : running.some((j) => j.stage === 'transcription')
              ? 'busy'
              : 'idle',
          current_job_id: running.find((j) => j.stage === 'transcription')?.id ?? null,
          heartbeat_at: iso,
        },
        {
          id: 'wrk-eval-1',
          kind: 'evaluation',
          state: state.ai.paused
            ? 'stopped'
            : running.some((j) => j.stage === 'evaluation')
              ? 'busy'
              : 'idle',
          current_job_id: running.find((j) => j.stage === 'evaluation')?.id ?? null,
          heartbeat_at: iso,
        },
        {
          id: 'wrk-cls-1',
          kind: 'classification',
          state: state.ai.paused
            ? 'stopped'
            : running.some((j) => j.stage === 'classification')
              ? 'busy'
              : 'idle',
          current_job_id: running.find((j) => j.stage === 'classification')?.id ?? null,
          heartbeat_at: iso,
        },
      ],
      queue: { queued, running: running.length, failed, paused: state.ai.paused },
      pbx: {
        state: pbx?.state ?? 'not_configured',
        enabled: pbx?.enabled ?? false,
        last_sync_at: pbx?.last_sync?.started_at ?? null,
      },
      email: {
        state: sender.state,
        last_delivery_at: state.notifications.deliveries[0]?.at ?? null,
        failed_24h: recent.filter((d) => d.status === 'failed').length,
        simulated_24h: recent.filter((d) => d.status === 'simulated').length,
      },
    };
  }

  return [
    { method: 'GET', pattern: '/system/health', handler: () => ok(health()) },
    {
      method: 'GET',
      pattern: '/system/errors',
      handler: ({ query }) => {
        const text = (query.search ?? '').trim().toLowerCase();
        return ok(
          errors()
            .map(sanitize)
            .filter((x) => query.include_acknowledged === 'true' || !x.acknowledged)
            .filter((x) => !query.severity || x.severity === query.severity)
            .filter((x) => !query.service || x.service === query.service)
            .filter(
              (x) =>
                !text ||
                [x.message, x.code, x.correlation_id].some((v) => v.toLowerCase().includes(text)),
            )
            .sort((a, b) => b.at.localeCompare(a.at)),
        );
      },
    },
    {
      method: 'POST',
      pattern: '/system/errors/:id/acknowledge',
      handler: ({ params }) => {
        const x = errors().find((e) => e.id === params.id);
        if (!x) return fail(404, 'Error record not found.');
        if (x.acknowledged) return fail(409, 'This error was already acknowledged.');
        x.acknowledged = true;
        x.acknowledged_by = ACTOR;
        x.acknowledged_at = new Date().toISOString();
        recordAudit(state, {
          resource: 'system_error',
          resourceId: x.id,
          action: 'acknowledged',
          summary: `${x.code} (${x.correlation_id}) acknowledged`,
        });
        persist();
        return ok(sanitize(x));
      },
    },
  ];
}
