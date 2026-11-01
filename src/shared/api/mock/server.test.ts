import { beforeEach, describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createMockTransport } from './server';

describe('simulated backend', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('requires a session and accepts each launch code once', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await expect(api.listAgents()).rejects.toMatchObject({ code: 'unauthorized' });
    await api.openSession('SYN-TEST01-DEMO');
    expect(await api.listAgents()).toHaveLength(4);
    await expect(api.openSession('SYN-TEST01-DEMO')).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('serves synthetic, labelled data and immutable re-score history', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-TEST02-DEMO');
    const demo = await api.listCalls({ search: 'DEMO-' });
    expect(demo.total).toBe(5);
    const all = await api.listCalls({ pageSize: 100 });
    expect(all.total).toBeGreaterThan(200);
    expect(all.items.every((c) => c.synthetic)).toBe(true);
    const before = await api.listEvaluations({ callId: 'DEMO-005' });
    const rescored = await api.rescoreCall('DEMO-005');
    expect(rescored).toMatchObject({
      trigger: 'rescore',
      supersedesId: before[0]?.id,
      simulated: true,
    });
    expect(await api.listEvaluations({ callId: 'DEMO-005' })).toHaveLength(before.length + 1);
  });

  it('seeds the approved scorecard and points-based results', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-TEST04-DEMO');
    const card = await api.getCurrentScorecard();
    expect(card.criteria.map((c) => c.maxPoints)).toEqual([1, 1, 2, 3, 2, 1]);
    expect(card).toMatchObject({
      minimumAssessablePoints: 6,
      lowScoreThreshold: 7,
      prohibitedPenalty: { points: 0 },
    });
    const [demo1] = await api.listEvaluations({ callId: 'DEMO-001' });
    expect(demo1).toMatchObject({
      outcome: 'scored',
      awardedPoints: 9,
      assessablePoints: 10,
      overallScore: 9,
    });
    const [demo4] = await api.listEvaluations({ callId: 'DEMO-004' });
    expect(demo4).toMatchObject({
      outcome: 'insufficient_evidence',
      assessablePoints: 4,
      overallScore: null,
    });
  });

  it('validates agent extensions on the server side too', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-TEST03-DEMO');
    await expect(
      api.createAgent({ displayName: 'X', extension: 'SYN-101', status: 'active', queueIds: [] }),
    ).rejects.toMatchObject({ code: 'validation_error', fieldIssues: [{ field: 'extension' }] });
  });
});
