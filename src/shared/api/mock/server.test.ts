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

  it('enforces the CSRF header on every non-exempt route, GET included', async () => {
    const transport = createMockTransport({ latencyMs: 0 });
    const res = await transport({
      method: 'POST',
      path: '/session/exchange',
      body: { code: 'SYN-TEST05-DEMO' },
    });
    expect(res.status).toBe(200);
    const token = (res.body as { csrf_token: string }).csrf_token;
    expect(token).toMatch(/^[0-9a-f]{48}$/);
    expect((await transport({ method: 'GET', path: '/calls' })).status).toBe(403);
    const wrong = { 'X-Taqeef-CSRF': 'nope' };
    expect((await transport({ method: 'GET', path: '/calls', headers: wrong })).status).toBe(403);
    const ok = { 'X-Taqeef-CSRF': token };
    expect((await transport({ method: 'GET', path: '/calls', headers: ok })).status).toBe(200);
    // A malformed exchange body is a 400 (contract 1.3).
    const bad = await transport({ method: 'POST', path: '/session/exchange', body: {} });
    expect(bad.status).toBe(400);
  });

  it('links each run to its transcript revision and evidence to that revision only', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-TEST06-DEMO');
    const call = await api.getCall('DEMO-001');
    expect(call.currentTranscriptRevisionId).toMatch(/^[0-9a-f-]{36}$/);
    const transcript = await api.getTranscript(call.currentTranscriptRevisionId ?? '');
    const [run] = await api.listEvaluations({ callId: 'DEMO-001' });
    expect(run?.transcriptRevisionId).toBe(transcript.revisionId);
    const ids = new Set(transcript.segments.map((seg) => seg.id));
    const cited = run?.criteria.flatMap((c) => c.evidence.map((e) => e.segmentId)) ?? [];
    expect(cited.length).toBeGreaterThan(0);
    expect(cited.every((id) => ids.has(id) && /^seg-\d{4}$/.test(id))).toBe(true);
    // Evidence carries no time or quote of its own.
    expect(Object.keys(run?.criteria[0]?.evidence[0] ?? {})).toEqual(['segmentId']);
    expect(run?.criteria.map((c) => c.result)).toContain('met');
  });
});
