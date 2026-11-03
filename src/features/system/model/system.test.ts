import { describe, expect, it } from 'vitest';
import type { SystemError, SystemHealth } from '@/shared/types/domain';
import { errorSummary, resourceGauges } from './system';

describe('system health helpers', () => {
  it('derives gauges with warning and critical thresholds', () => {
    const h = {
      resources: {
        cpuPct: 85,
        ramUsedGb: 60,
        ramTotalGb: 64,
        gpus: [
          { id: 'g', name: 'g', utilPct: 10, memUsedGb: 23, memTotalGb: 24, temperatureC: 50 },
        ],
        disks: [],
      },
    } as unknown as SystemHealth;
    expect(resourceGauges(h).map((g) => [g.key, g.status])).toEqual([
      ['cpu', 'warning'],
      ['ram', 'critical'],
      ['gpuUtil', 'ok'],
      ['gpuMem', 'critical'],
    ]);
  });

  it('counts open errors by severity, weighted by repeat count', () => {
    const e = (severity: SystemError['severity'], count: number, acknowledged = false) =>
      ({ severity, count, acknowledged }) as SystemError;
    expect(errorSummary([e('error', 3), e('warning', 2), e('critical', 1, true)])).toEqual({
      critical: 0,
      error: 3,
      warning: 2,
    });
  });
});
