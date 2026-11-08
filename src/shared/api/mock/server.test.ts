import { beforeEach, describe, expect, it } from 'vitest';
import { createApiClient, type ApiClient } from '../client';
import type { ApiError } from '../errors';
import { createMockTransport } from './server';

/** Runs of one call via the documented routes: history (#18), then each detail (#19). */
async function listRuns(api: ApiClient, callId: string) {
  const history = await api.listRunHistory(callId);
  return Promise.all(history.map((h) => api.getRun(h.runId)));
}

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
      api.createAgent({ displayName: ` ${target.displayName.toUpperCase()} ` }),
    ).rejects.toMatchObject({ fieldIssues: [{ field: 'display_name', reason: 'name_exists' }] });
    const wav = new File(['x'], 'a.wav', { type: 'audio/wav' });
    for (const [agentId, reason] of [
      [target.id, 'already_retired'],
      ['agt-missing', 'unknown_agent'],
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
    const before = await listRuns(api, 'DEMO-005');
    const rescored = await api.rescoreCall('DEMO-005');
    expect(rescored).toMatchObject({
      trigger: 'rescore',
      supersedesId: before[0]?.id,
    });
    expect(await listRuns(api, 'DEMO-005')).toHaveLength(before.length + 1);
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
    const [demo1] = await listRuns(api, 'DEMO-001');
    expect(demo1).toMatchObject({
      outcome: 'scored',
      unit: 1,
      awardedUnits: 9,
      assessableUnits: 10,
      displayHundredths: 900,
      belowThreshold: false,
      thresholdHundredths: 700,
    });
    const [demo4] = await listRuns(api, 'DEMO-004');
    expect(demo4).toMatchObject({
      outcome: 'insufficient_evidence',
      assessableUnits: 4,
      displayHundredths: null,
      belowThreshold: null,
    });
  });

  it('applies the v0.3 agent name rules and refuses masked values (§4.2, §2.2.1)', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-TEST03-DEMO');
    const reasonFor = async (displayName: string) =>
      ((await api.createAgent({ displayName }).catch((e: unknown) => e)) as ApiError).fieldIssues[0]
        ?.reason;
    expect(await reasonFor('Agent 7')).toBe('name_digits');
    expect(await reasonFor('Agentأ')).toBe('name_mixed_script');
    expect(await reasonFor('Agent\u200bX')).toBe('name_invalid_char');
    expect(await reasonFor('x'.repeat(81))).toBe('name_length');
    expect(await reasonFor('Caller [NUMBER]')).toBe('edit_value_masked');
    // Arabic spelling variants count as the same name.
    await api.createAgent({ displayName: 'أحمد علي' });
    expect(await reasonFor('احمد  علي')).toBe('name_exists');
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
    const [run] = await listRuns(api, 'DEMO-001');
    expect(run?.transcriptRevisionId).toBe(transcript.revisionId);
    const ids = new Set(transcript.segments.map((seg) => seg.id));
    const cited = run?.criteria.flatMap((c) => c.evidence.map((e) => e.segmentId)) ?? [];
    expect(cited.length).toBeGreaterThan(0);
    expect(cited.every((id) => ids.has(id) && /^seg-\d{4}$/.test(id))).toBe(true);
    // Evidence carries no time or quote of its own.
    // v0.3 §7.5: the pair, times, the server excerpt (a prefix of the segment text) and flags.
    const first = run?.criteria[0]?.evidence[0];
    expect(first?.transcriptRevisionId).toBe(transcript.revisionId);
    const seg = transcript.segments.find((x) => x.id === first?.segmentId);
    expect(first).toMatchObject({ startMs: seg?.startMs, excerptTruncated: false, counted: true });
    expect(seg?.text.startsWith(first?.excerpt ?? '#')).toBe(true);
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
    const [run] = await listRuns(api, 'DEMO-002');
    // DEMO-002 was re-transcribed: its run stays linked to the earlier revision.
    expect(run?.transcriptRevisionId).not.toBe(call2.currentTranscriptRevisionId);
    const revisions = await api.listTranscriptRevisions('DEMO-002');
    expect(revisions.map((r) => [r.revisionNo, r.isCurrent])).toEqual([
      [0, false],
      [1, true],
    ]);
    expect(revisions[0]?.revisionId).toBe(run?.transcriptRevisionId);
    // Re-scoring evaluates the current revision.
    const rescored = await api.rescoreCall('DEMO-002');
    expect(rescored.transcriptRevisionId).toBe(call2.currentTranscriptRevisionId);
  });

  it('returns the structured error envelope without echoing input', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-TEST09-DEMO');
    const err = await api.createAgent({ displayName: 'Agent A' }).catch((e: unknown) => e);
    expect(err).toMatchObject({
      code: 'validation_error',
      serverCode: 'demo.mock.http_422',
      fieldIssues: [{ field: 'display_name', reason: 'name_exists' }],
    });
    expect(JSON.stringify(err)).not.toContain('Agent A');
  });

  it('activates a scorecard draft as a new immutable version', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-TEST10-DEMO');
    const current = await api.getLatestScorecardVersion();
    const saved = await api.saveScorecardVersion({ ...current, changeNote: 'Synthetic change' });
    expect(saved.version).toBe(current.version + 1);
    expect((await api.getLatestScorecardVersion()).version).toBe(saved.version);
  });

  it('computes dashboard figures server-side with the §11 rules', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-DASH-DEMO');
    const versions = await api.listScorecardVersions();
    expect(versions.filter((v) => v.status === 'active')).toHaveLength(1);
    const all = await api.getDashboard({ scorecardVersionId: null, agentId: null });
    // Scored latest runs: DEMO-001 9.00, DEMO-002 8.00, DEMO-003 v2, DEMO-005 5.00 (+ DEMO-004 no score).
    expect(all.outcomes).toMatchObject({ scored: 4, insufficientEvidence: 1 });
    expect(all.average?.basedOnN).toBe(4);
    expect(all.threshold.mode).toBe('single');
    const v1 = versions.find((v) => v.version === 1);
    const one = await api.getDashboard({
      scorecardVersionId: v1?.scorecardVersionId ?? '',
      agentId: null,
    });
    expect(one.scope).toBe('version');
    // Version scope: each call's v1 run, including DEMO-003's older v1 run.
    expect(one.outcomes.scored).toBe(4);
    const agent = await api.getDashboard({ scorecardVersionId: null, agentId: 'agt-001' });
    expect(agent.agentDisplayName).toBe('Agent A');
    expect(agent.outcomes.scored).toBeLessThan(all.outcomes.scored);
  });

  it('activating a scorecard makes it the only active version', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-ACT-DEMO');
    const before = await api.getActiveScorecardVersion();
    const saved = await api.saveScorecardVersion({ ...before, changeNote: 'Synthetic change' });
    const active = await api.getActiveScorecardVersion();
    expect(active.version).toBe(saved.version);
    expect((await api.listScorecardVersions()).filter((v) => v.status === 'active')).toHaveLength(
      1,
    );
  });

  it('hides as a soft delete and restores (contract v0.3 §5.4)', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-HIDE-DEMO');
    const before = await api.getDashboard({ scorecardVersionId: null, agentId: null });
    const runsBefore = await listRuns(api, 'DEMO-005');
    const hidden = await api.hideCall('DEMO-005', 'Synthetic duplicate');
    expect(hidden).toMatchObject({ id: 'DEMO-005', hidden: true });
    // Excluded from the default list and the dashboard, included on request.
    expect((await api.listCalls()).map((c) => c.id)).not.toContain('DEMO-005');
    expect((await api.listCalls({ includeHidden: true })).map((c) => c.id)).toContain('DEMO-005');
    const after = await api.getDashboard({ scorecardVersionId: null, agentId: null });
    expect(after.callsTotal).toBe(before.callsTotal - 1);
    // Nothing is removed: the call, its runs, transcript and latest run remain.
    const detail = await api.getCall('DEMO-005');
    expect(detail.hidden).toBe(true);
    expect(detail.latestRun?.runId).toBe(runsBefore[0]?.id);
    expect(await listRuns(api, 'DEMO-005')).toHaveLength(runsBefore.length);
    await expect(api.getTranscript(detail.currentTranscriptRevisionId ?? '')).resolves.toBeTruthy();
    // Stale actions are refused (mock assumption, see handoff): hide twice, restore twice.
    await expect(api.hideCall('DEMO-005')).rejects.toMatchObject({ code: 'conflict' });
    expect((await api.restoreCall('DEMO-005')).hidden).toBe(false);
    await expect(api.restoreCall('DEMO-005')).rejects.toMatchObject({ code: 'conflict' });
    expect((await api.listCalls()).map((c) => c.id)).toContain('DEMO-005');
  });

  it('replays a repeated request_id without repeating the side effect (§2.1)', async () => {
    const transport = createMockTransport({ latencyMs: 0 });
    const res = await transport({
      method: 'POST',
      path: '/session/exchange',
      body: { code: 'SYN-REPLAY-DEMO' },
    });
    const headers = { 'X-Taqeef-CSRF': (res.body as { csrf_token: string }).csrf_token };
    const hide = { method: 'DELETE' as const, path: '/calls/DEMO-001', headers };
    // CSRF is required on the state-changing route.
    expect((await transport({ ...hide, headers: {}, body: { request_id: 'r1' } })).status).toBe(
      403,
    );
    const first = await transport({ ...hide, body: { request_id: 'r1' } });
    const replay = await transport({ ...hide, body: { request_id: 'r1' } });
    expect([first.status, replay.status]).toEqual([200, 200]);
    expect((replay.body as { hidden: boolean }).hidden).toBe(true);
    // The same request_id on another route is a conflict; nothing runs.
    const conflict = await transport({
      method: 'POST',
      path: '/calls/DEMO-001/restore',
      headers,
      body: { request_id: 'r1' },
    });
    expect(conflict.status).toBe(409);
    expect(JSON.stringify(conflict.body)).toContain('request_id_conflict');
    const list = await transport({
      method: 'GET',
      path: '/calls',
      headers,
      query: { include_hidden: 'true' },
    });
    const demo1 = (list.body as { items: { call_id: string; hidden: boolean }[] }).items.find(
      (c) => c.call_id === 'DEMO-001',
    );
    expect(demo1?.hidden).toBe(true);
    // A missing request_id is refused before anything runs.
    expect((await transport({ ...hide, path: '/calls/DEMO-002', body: {} })).status).toBe(422);
  });

  it('serves run history, details with per-run speaker roles, and hits without excerpts', async () => {
    const api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
    await api.openSession('SYN-RUNS-DEMO');
    const history = await api.listRunHistory('DEMO-003');
    expect(history.map((h) => h.trigger)).toEqual(['rescore', 'initial']); // newest first
    expect(history[0]?.previousRunId).toBe(history[1]?.runId);
    const run = await api.getRun(history[0]?.runId ?? '');
    const transcript = await api.getTranscript(run.transcriptRevisionId);
    // Stereo fixture: roles come from the run, one per segment of that revision.
    expect(run.segmentRoles.size).toBe(transcript.segments.length);
    expect([...run.segmentRoles.values()].map((r) => r.role)).toContain('agent');
    const hit = run.prohibitedHits[0];
    expect(hit?.transcriptRevisionId).toBe(run.transcriptRevisionId);
    expect(hit).not.toHaveProperty('excerpt');
    // Mono upload-style call: roles unknown.
    const demo2 = await listRuns(api, 'DEMO-002');
    expect(demo2[0]?.criteria.every((c) => c.name.en.length > 0)).toBe(true);
  });
});
