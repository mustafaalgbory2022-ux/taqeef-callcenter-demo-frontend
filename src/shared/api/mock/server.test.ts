import { beforeEach, describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createMockTransport } from './server';

describe('simulated backend', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('keeps the simulated session across a reload via GET /session (v0.2.1 §D)', async () => {
    const first = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await first.openSession('SYN-RELOAD-DEMO');
    // A "reload" is a new client and a new transport over the same simulated cookie.
    const transport = createMockTransport({ latencyMs: 0 });
    const reloaded = createApiClient(transport, 'mock');
    await expect(reloaded.getSession()).resolves.toBeNull();
    await expect(reloaded.resumeSession()).resolves.toMatchObject({ mode: 'mock' });
    expect(await reloaded.listCalls()).toHaveLength(5);
    // GET /session has no side effects: it does not extend the idle timer.
    const before = sessionStorage.getItem('taqeef.mock.serverSession');
    await transport({ method: 'GET', path: '/session' });
    expect(sessionStorage.getItem('taqeef.mock.serverSession')).toBe(before);
  });

  it('expires the simulated session after 30 minutes idle', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-IDLE-DEMO');
    const s = JSON.parse(sessionStorage.getItem('taqeef.mock.serverSession') ?? '{}');
    s.lastSeenAt -= 31 * 60_000;
    sessionStorage.setItem('taqeef.mock.serverSession', JSON.stringify(s));
    const reloaded = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await expect(reloaded.resumeSession()).resolves.toBeNull();
  });

  it('lists active agents by default, retires permanently and rejects retired uploads', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-AGENTS-DEMO');
    const before = await api.listAgents();
    const target = before[0];
    if (!target) throw new Error('fixture');
    const retired = await api.retireAgent(target.id);
    expect(retired.status).toBe('retired');
    expect((await api.listAgents()).map((a) => a.id)).not.toContain(target.id);
    expect((await api.listAgents({ includeRetired: true })).map((a) => a.id)).toContain(target.id);
    await expect(api.retireAgent(target.id)).rejects.toMatchObject({ code: 'conflict' });
    await expect(
      api.createAgent({ displayName: ` ${target.displayName.toUpperCase()} `, extension: '' }),
    ).rejects.toMatchObject({ fieldIssues: [{ field: 'display_name', reason: 'duplicate' }] });
    const wav = new File(['x'], 'a.wav', { type: 'audio/wav' });
    for (const [agentId, reason] of [
      [target.id, 'agent_retired'],
      ['agt-missing', 'agent_unknown'],
      ['', 'agent_required'],
    ] as const) {
      const err = await api
        .uploadCall({ file: wav, displayName: '', agentId, channelMap: null })
        .catch((e: unknown) => e);
      expect(err).toMatchObject({ fieldIssues: [{ field: 'agent_id', reason }] });
      expect(JSON.stringify(err)).not.toContain(agentId || '\u0000');
    }
    // Calls keep their agent, with the agent's display name from the call payload.
    const calls = await api.listCalls();
    expect(calls.find((c) => c.agentId === target.id)?.agentDisplayName).toBe(target.displayName);
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
    const card = await api.getLatestScorecardVersion();
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
      displayHundredths: 900,
      belowThreshold: false,
      thresholdHundredths: 700,
    });
    const [demo4] = await api.listEvaluations({ callId: 'DEMO-004' });
    expect(demo4).toMatchObject({
      outcome: 'insufficient_evidence',
      assessablePoints: 4,
      displayHundredths: null,
      belowThreshold: null,
    });
  });

  it('validates agent extensions on the server side too', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-TEST03-DEMO');
    await expect(api.createAgent({ displayName: 'X', extension: 'SYN-101' })).rejects.toMatchObject(
      { code: 'validation_error', fieldIssues: [{ field: 'extension' }] },
    );
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

  it('serves no queue or branding routes (contract v0.2 item 1)', async () => {
    const transport = createMockTransport({ latencyMs: 0 });
    const res = await transport({
      method: 'POST',
      path: '/session/exchange',
      body: { code: 'SYN-TEST07-DEMO' },
    });
    const headers = { 'X-Taqeef-CSRF': (res.body as { csrf_token: string }).csrf_token };
    for (const path of ['/queues', '/branding', '/scorecards/current']) {
      expect((await transport({ method: 'GET', path, headers })).status).toBe(404);
    }
  });

  it('reports call status from the latest explicit outcome and keeps the run revision', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-TEST08-DEMO');
    expect((await api.getCall('DEMO-001')).status).toBe('scored');
    expect((await api.getCall('DEMO-004')).status).toBe('insufficient_evidence');
    const call2 = await api.getCall('DEMO-002');
    const [run] = await api.listEvaluations({ callId: 'DEMO-002' });
    // DEMO-002 was re-transcribed: its run stays linked to the earlier revision.
    expect(run?.transcriptRevisionId).not.toBe(call2.currentTranscriptRevisionId);
    const older = await api.getTranscript(run?.transcriptRevisionId ?? '');
    const newer = await api.getTranscript(call2.currentTranscriptRevisionId ?? '');
    expect([older.revisionNo, newer.revisionNo]).toEqual([0, 1]);
    // Re-scoring evaluates the current revision.
    const rescored = await api.rescoreCall('DEMO-002');
    expect(rescored.transcriptRevisionId).toBe(call2.currentTranscriptRevisionId);
  });

  it('returns the structured error envelope without echoing input', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-TEST09-DEMO');
    const err = await api
      .createAgent({ displayName: 'Secret Name', extension: 'SYN-101' })
      .catch((e: unknown) => e);
    expect(err).toMatchObject({
      code: 'validation_error',
      serverCode: 'demo.mock.http_422',
      fieldIssues: [{ field: 'extension', reason: 'duplicate' }],
    });
    expect(JSON.stringify(err)).not.toContain('Secret Name');
  });

  it('activates a scorecard draft as a new immutable version', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-TEST10-DEMO');
    const current = await api.getLatestScorecardVersion();
    const saved = await api.saveScorecardVersion({ ...current, changeNote: 'Synthetic change' });
    expect(saved.version).toBe(current.version + 1);
    expect((await api.getLatestScorecardVersion()).version).toBe(saved.version);
  });
});
