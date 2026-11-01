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
    const calls = await api.listCalls();
    expect(calls).toHaveLength(5);
    expect(calls.every((c) => c.synthetic)).toBe(true);
    const before = await api.listEvaluations({ callId: 'DEMO-005' });
    const rescored = await api.rescoreCall('DEMO-005');
    expect(rescored).toMatchObject({
      trigger: 'rescore',
      supersedesId: before[0]?.id,
      simulated: true,
    });
    expect(await api.listEvaluations({ callId: 'DEMO-005' })).toHaveLength(before.length + 1);
  });

  it('validates agent extensions on the server side too', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-TEST03-DEMO');
    await expect(
      api.createAgent({ displayName: 'X', extension: 'SYN-101', status: 'active', queueIds: [] }),
    ).rejects.toMatchObject({ code: 'validation_error', fieldIssues: [{ field: 'extension' }] });
  });
});
