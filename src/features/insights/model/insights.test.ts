import { describe, expect, it } from 'vitest';
import type { InsightRow } from '@/shared/types/domain';
import { summarizeInsights } from './insights';

const row = (
  callId: string,
  date: string,
  reason: InsightRow['reason'],
  complaint = false,
  serviceRequest = false,
): InsightRow => ({
  callId,
  recordedAt: `${date}T10:00:00+03:00`,
  queueId: 'q-6002',
  agentId: 'agt-001',
  reason,
  complaint,
  serviceRequest,
});

describe('summarizeInsights', () => {
  it('counts reasons, complaints and service requests separately', () => {
    const s = summarizeInsights(
      [
        row('1', '2026-10-01', 'billing', true),
        row('2', '2026-10-01', 'billing', false, true),
        row('3', '2026-10-08', 'technical', true),
      ],
      (d) => d.slice(0, 7),
    );
    expect(s).toMatchObject({ total: 3, complaints: 2, serviceRequests: 1 });
    expect(s.byReason[0]).toEqual({
      reason: 'billing',
      calls: 2,
      complaints: 1,
      serviceRequests: 1,
    });
    expect(s.complaintTrend).toEqual([{ period: '2026-10', complaints: 2, calls: 3 }]);
  });
});
