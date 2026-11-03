import type { BadgeTone } from '@/shared/ui/Badge';
import type { ErrorSeverity, HealthState, SystemError, SystemHealth } from '@/shared/types/domain';
import { usedPct, volumeStatus } from '@/shared/utils/storageRules';

export const HEALTH_TONE: Record<HealthState, BadgeTone> = {
  healthy: 'success',
  degraded: 'warning',
  down: 'danger',
  unknown: 'neutral',
};
export const SEVERITY_TONE: Record<ErrorSeverity, BadgeTone> = {
  critical: 'danger',
  error: 'danger',
  warning: 'warning',
};

export interface Gauge {
  key: 'cpu' | 'ram' | 'gpuUtil' | 'gpuMem';
  label: string;
  pct: number;
  status: 'ok' | 'warning' | 'critical';
  used: number;
  total: number;
}

/** Resource gauges with the same 80 % / 90 % thresholds as storage. */
export function resourceGauges(h: SystemHealth): Omit<Gauge, 'label'>[] {
  const gauge = (key: Gauge['key'], used: number, total: number) => {
    const s = volumeStatus(used, total);
    return {
      key,
      used,
      total,
      pct: usedPct(used, total),
      status: s === 'unavailable' ? 'critical' : s,
    } as const;
  };
  const gpu = h.resources.gpus[0];
  return [
    gauge('cpu', h.resources.cpuPct, 100),
    gauge('ram', h.resources.ramUsedGb, h.resources.ramTotalGb),
    ...(gpu
      ? [gauge('gpuUtil', gpu.utilPct, 100), gauge('gpuMem', gpu.memUsedGb, gpu.memTotalGb)]
      : []),
  ];
}

/** Open errors grouped by severity for the summary line. */
export function errorSummary(errors: readonly SystemError[]): Record<ErrorSeverity, number> {
  const out: Record<ErrorSeverity, number> = { critical: 0, error: 0, warning: 0 };
  for (const e of errors) if (!e.acknowledged) out[e.severity] += e.count;
  return out;
}
