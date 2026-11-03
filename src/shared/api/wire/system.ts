import type { SystemError, SystemHealth } from '@/shared/types/domain';
import { redactSensitive } from '@/shared/utils/redact';
import {
  arrayOf,
  bool,
  nullable,
  num,
  numInRange,
  object,
  oneOf,
  str,
  type Decoded,
} from '../decode';

/* PROVISIONAL wire shapes for system health and the admin error log. */

const SERVICES = [
  'api',
  'database',
  'transcription_worker',
  'evaluation_worker',
  'pbx_ingestion',
  'email_delivery',
  'scheduler',
] as const;
const HEALTH = ['healthy', 'degraded', 'down', 'unknown'] as const;
const pct = numInRange(0, 100);

export const wireHealth = object({
  generated_at: str,
  simulated: bool,
  overall: oneOf(HEALTH),
  services: arrayOf(
    object({
      id: oneOf(SERVICES),
      state: oneOf(HEALTH),
      latency_ms: nullable(num),
      detail: str,
      checked_at: str,
    }),
  ),
  resources: object({
    cpu_pct: pct,
    ram_used_gb: num,
    ram_total_gb: num,
    gpus: arrayOf(
      object({
        id: str,
        name: str,
        util_pct: pct,
        mem_used_gb: num,
        mem_total_gb: num,
        temperature_c: num,
      }),
    ),
    disks: arrayOf(
      object({
        volume_id: str,
        name: str,
        used_gb: num,
        total_gb: num,
        status: oneOf(['ok', 'warning', 'critical', 'unavailable']),
      }),
    ),
  }),
  workers: arrayOf(
    object({
      id: str,
      kind: oneOf(['transcription', 'evaluation', 'classification']),
      state: oneOf(['busy', 'idle', 'stopped', 'error']),
      current_job_id: nullable(str),
      heartbeat_at: str,
    }),
  ),
  queue: object({ queued: num, running: num, failed: num, paused: bool }),
  pbx: object({
    state: oneOf(['not_configured', 'configured', 'connected', 'error', 'disabled']),
    enabled: bool,
    last_sync_at: nullable(str),
  }),
  email: object({
    state: oneOf(['not_configured', 'configured', 'verified', 'error']),
    last_delivery_at: nullable(str),
    failed_24h: num,
    simulated_24h: num,
  }),
});

export function healthFromWire(w: Decoded<typeof wireHealth>): SystemHealth {
  return {
    generatedAt: w.generated_at,
    simulated: w.simulated,
    overall: w.overall,
    services: w.services.map((s) => ({
      id: s.id,
      state: s.state,
      latencyMs: s.latency_ms,
      detail: redactSensitive(s.detail),
      checkedAt: s.checked_at,
    })),
    resources: {
      cpuPct: w.resources.cpu_pct,
      ramUsedGb: w.resources.ram_used_gb,
      ramTotalGb: w.resources.ram_total_gb,
      gpus: w.resources.gpus.map((g) => ({
        id: g.id,
        name: g.name,
        utilPct: g.util_pct,
        memUsedGb: g.mem_used_gb,
        memTotalGb: g.mem_total_gb,
        temperatureC: g.temperature_c,
      })),
      disks: w.resources.disks.map((d) => ({
        volumeId: d.volume_id,
        name: d.name,
        usedGb: d.used_gb,
        totalGb: d.total_gb,
        status: d.status,
      })),
    },
    workers: w.workers.map((x) => ({
      id: x.id,
      kind: x.kind,
      state: x.state,
      currentJobId: x.current_job_id,
      heartbeatAt: x.heartbeat_at,
    })),
    queue: w.queue,
    pbx: { state: w.pbx.state, enabled: w.pbx.enabled, lastSyncAt: w.pbx.last_sync_at },
    email: {
      state: w.email.state,
      lastDeliveryAt: w.email.last_delivery_at,
      failed24h: w.email.failed_24h,
      simulated24h: w.email.simulated_24h,
    },
  };
}

export const wireSystemError = object({
  id: str,
  at: str,
  severity: oneOf(['critical', 'error', 'warning']),
  service: oneOf(SERVICES),
  code: str,
  message: str,
  correlation_id: str,
  count: num,
  acknowledged: bool,
  acknowledged_by: nullable(str),
  acknowledged_at: nullable(str),
});

/** Messages are redacted again on decode, in case the backend missed something. */
export function systemErrorFromWire(w: Decoded<typeof wireSystemError>): SystemError {
  return {
    id: w.id,
    at: w.at,
    severity: w.severity,
    service: w.service,
    code: w.code,
    message: redactSensitive(w.message),
    correlationId: w.correlation_id,
    count: w.count,
    acknowledged: w.acknowledged,
    acknowledgedBy: w.acknowledged_by,
    acknowledgedAt: w.acknowledged_at,
  };
}
