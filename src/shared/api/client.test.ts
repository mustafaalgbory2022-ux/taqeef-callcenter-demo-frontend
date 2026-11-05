import { describe, expect, it, vi } from 'vitest';
import { CALL_STATUSES } from '@/shared/types/domain';
import { createApiClient } from './client';
import { endpoints } from './endpoints';
import { ApiError } from './errors';
import { createFetchTransport, type ApiRequest, type Transport } from './transport';

const REV = '0193a000-0000-7000-8000-000000000001';

const wireCall = {
  id: 'DEMO-001',
  title: 'Synthetic',
  agent_id: 'agt-001',
  queue_id: null,
  language: 'ar',
  duration_ms: 78000,
  recorded_at: '2026-10-20T07:12:00.000Z',
  status: 'scored',
  current_transcript_revision_id: '0193a000-0000-7000-8000-000000000001',
  synthetic: true,
  simulated: false,
  source: 'fixture',
  channel_layout: 'dual',
};

const respond = (status: number, body: unknown) =>
  vi.fn<Transport>().mockResolvedValue({ status, body });

describe('ApiClient over a transport', () => {
  it('maps snake_case wire data to camelCase domain types', async () => {
    const transport = respond(200, [wireCall]);
    const [call] = await createApiClient(transport, 'live').listCalls({ agentId: 'agt-001' });
    expect(call).toMatchObject({
      agentId: 'agt-001',
      durationMs: 78000,
      recordedAt: wireCall.recorded_at,
    });
    expect(transport).toHaveBeenCalledWith({
      method: 'GET',
      path: '/calls',
      query: { agent_id: 'agt-001' },
    });
  });

  it('requires UTC timestamps with milliseconds and Z (contract v0.2 item 4)', async () => {
    for (const recorded_at of ['2026-10-20T10:12:00+03:00', '2026-10-20T07:12:00Z', '2026-10-20']) {
      await expect(
        createApiClient(respond(200, [{ ...wireCall, recorded_at }]), 'live').listCalls(),
      ).rejects.toMatchObject({ code: 'contract_mismatch' });
    }
  });

  it('decodes all twelve confirmed call statuses and rejects others', async () => {
    for (const status of CALL_STATUSES) {
      const [call] = await createApiClient(
        respond(200, [{ ...wireCall, status }]),
        'live',
      ).listCalls();
      expect(call?.status).toBe(status);
    }
    await expect(
      createApiClient(respond(200, [{ ...wireCall, status: 'failed' }]), 'live').listCalls(),
    ).rejects.toMatchObject({ code: 'contract_mismatch' });
  });

  it('saves a scorecard as draft then activates it, and reads the newest version', async () => {
    const version = {
      scorecard_id: 'sc',
      version: 3,
      name: { en: 'S', ar: 'س' },
      low_score_threshold: 7,
      minimum_assessable_points: 6,
      criteria: [],
      prohibited_expressions: [],
      prohibited_penalty: { points: 0, criterion_id: null },
      created_at: '2026-11-05T09:30:00.000Z',
      created_by: 'x',
      change_note: 'n',
    };
    const transport = vi
      .fn<Transport>()
      .mockResolvedValueOnce({ status: 200, body: {} })
      .mockResolvedValueOnce({ status: 201, body: version })
      .mockResolvedValueOnce({ status: 200, body: [{ ...version, version: 2 }, version] });
    const api = createApiClient(transport, 'live');
    await api.saveScorecardVersion({
      name: version.name,
      lowScoreThreshold: 7,
      minimumAssessablePoints: 6,
      criteria: [],
      prohibitedExpressions: [],
      prohibitedPenalty: { points: 0, criterionId: null },
      changeNote: 'n',
    });
    expect((await api.getLatestScorecardVersion()).version).toBe(3);
    const [put, activate, list] = transport.mock.calls.map(([r]) => r);
    expect(put).toMatchObject({ method: 'PUT', path: '/scorecard/draft' });
    expect(activate).toMatchObject({ method: 'POST', path: '/scorecard/activate' });
    expect(list).toMatchObject({ method: 'GET', path: '/scorecard/versions' });
  });

  it('sends snake_case request bodies', async () => {
    const transport = respond(201, { ...wireCall });
    await createApiClient(transport, 'live')
      .createAgent({
        displayName: ' Agent E ',
        extension: 'SYN-105',
      })
      .catch(() => undefined);
    const req = transport.mock.calls[0]?.[0] as ApiRequest;
    // Create only: no status (a new agent is active) and no rename route.
    expect(req.body).toEqual({ display_name: 'Agent E', extension: 'SYN-105' });
  });

  it('rejects responses that break the contract', async () => {
    const client = createApiClient(respond(200, [{ ...wireCall, duration_ms: 'long' }]), 'live');
    await expect(client.listCalls()).rejects.toMatchObject({ code: 'contract_mismatch' });
  });

  const run = {
    id: 'e',
    call_id: 'c',
    agent_id: null,
    scorecard_id: 's',
    scorecard_version: 1,
    transcript_revision_id: 'rev-1',
    outcome: 'scored',
    awarded_points: 7,
    assessable_points: 10,
    possible_points: 10,
    minimum_assessable_points: 6,
    display_hundredths: 700,
    below_threshold: false,
    threshold_hundredths: 700,
    criteria: [],
    prohibited_hits: [],
    trigger: 'initial',
    supersedes_id: null,
    created_at: '2026-10-01T00:00:00.000Z',
    simulated: false,
  };

  it('reads the displayed score from display_hundredths, ignoring any overall_score', async () => {
    const [e] = await createApiClient(
      respond(200, [{ ...run, display_hundredths: 699, overall_score: 7.0 }]),
      'live',
    ).listEvaluations();
    expect(e).toMatchObject({ displayHundredths: 699, belowThreshold: false });
    expect(e).not.toHaveProperty('overallScore');
  });

  it('rejects non-integer or out-of-range display_hundredths', async () => {
    for (const d of [699.5, -1, 1001, '699']) {
      await expect(
        createApiClient(
          respond(200, [{ ...run, display_hundredths: d }]),
          'live',
        ).listEvaluations(),
      ).rejects.toMatchObject({ code: 'contract_mismatch' });
    }
  });

  it('requires display_hundredths and below_threshold exactly when scored', async () => {
    const bad = [
      { ...run, display_hundredths: null },
      { ...run, below_threshold: null },
      { ...run, outcome: 'insufficient_evidence' },
      { ...run, outcome: 'not_assessable', display_hundredths: null },
    ];
    for (const body of bad) {
      await expect(
        createApiClient(respond(200, [body]), 'live').listEvaluations(),
      ).rejects.toMatchObject({ code: 'contract_mismatch' });
    }
    const [none] = await createApiClient(
      respond(200, [
        { ...run, outcome: 'not_assessable', display_hundredths: null, below_threshold: null },
      ]),
      'live',
    ).listEvaluations();
    expect(none).toMatchObject({ displayHundredths: null, belowThreshold: null });
  });

  it('rejects a run without an explicit outcome (a failed evaluation creates no run)', async () => {
    const failed = {
      id: 'e',
      call_id: 'c',
      agent_id: null,
      scorecard_id: 's',
      scorecard_version: 1,
      transcript_revision_id: REV,
      outcome: null,
      awarded_points: 0,
      assessable_points: 0,
      possible_points: 10,
      minimum_assessable_points: 6,
      display_hundredths: null,
      below_threshold: null,
      threshold_hundredths: null,
      criteria: [],
      prohibited_hits: [],
      trigger: 'rescore',
      supersedes_id: null,
      created_at: '2026-10-01T00:00:00.000Z',
      simulated: false,
    };
    await expect(
      createApiClient(respond(200, [failed]), 'live').listEvaluations(),
    ).rejects.toMatchObject({ code: 'contract_mismatch' });
    const [na] = await createApiClient(
      respond(200, [{ ...failed, outcome: 'not_assessable' }]),
      'live',
    ).listEvaluations();
    expect(na).toMatchObject({ outcome: 'not_assessable', displayHundredths: null });
  });

  it('treats revision and segment ids as opaque, rejecting only empty ids (v0.2.1 §C)', async () => {
    const opaque = createApiClient(
      respond(200, { call_id: 'c', transcript_revision_id: 'rev-1', revision_no: 0, segments: [] }),
      'live',
    );
    await expect(opaque.getTranscript('rev-1')).resolves.toMatchObject({ revisionId: 'rev-1' });
    const api = createApiClient(
      respond(200, { call_id: 'c', transcript_revision_id: '', revision_no: 0, segments: [] }),
      'live',
    );
    await expect(api.getTranscript('x')).rejects.toMatchObject({ code: 'contract_mismatch' });
    const segApi = createApiClient(
      respond(200, {
        call_id: 'c',
        transcript_revision_id: REV,
        revision_no: 0,
        segments: [
          { segment_id: 's1', start_ms: 0, end_ms: 1, speaker: 'agent', language: 'ar', text: 'x' },
        ],
      }),
      'live',
    );
    await expect(segApi.getTranscript(REV)).resolves.toMatchObject({
      segments: [{ id: 's1' }],
    });
  });

  it('maps the structured error envelope, keeping only safe codes (contract v0.2 item 9)', async () => {
    const CID = '0193a000-0000-7000-8000-0000000000aa';
    const body = {
      error: {
        code: 'demo.agents.extension_taken',
        message: 'Extension SYN-999 already used by <b>Agent</b>',
        correlation_id: CID,
        fields: [
          { field: 'extension', reason: 'duplicate' },
          { field: 'display_name', reason: 'Name <script> is bad' },
          { field: 'bad field!', reason: 'required' },
        ],
      },
    };
    const err = await createApiClient(respond(422, body), 'live')
      .createAgent({ displayName: 'Agent X', extension: 'x' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      code: 'validation_error',
      serverCode: 'demo.agents.extension_taken',
      correlationId: CID,
      fieldIssues: [
        { field: 'extension', reason: 'duplicate' },
        { field: 'display_name', reason: 'invalid' },
      ],
    });
    // Server text (which could echo input) is never kept.
    expect(JSON.stringify(err)).not.toContain('SYN-999');
    expect((err as ApiError).message).not.toContain('SYN-999');
  });

  it('maps 403, 413, 415 and 429 without an envelope', async () => {
    const codes: Record<number, string> = {
      403: 'forbidden',
      413: 'payload_too_large',
      415: 'unsupported_media_type',
      429: 'rate_limited',
    };
    for (const [status, code] of Object.entries(codes)) {
      await expect(
        createApiClient(respond(Number(status), 'raw <html> body'), 'live').listCalls(),
      ).rejects.toMatchObject({ code, fieldIssues: [] });
    }
  });

  it('has no session until a launch code is exchanged', async () => {
    const transport = respond(200, {});
    await expect(createApiClient(transport, 'live').getSession()).resolves.toBeNull();
    expect(transport).not.toHaveBeenCalled();
  });
});

describe('session and CSRF (demo API contract 1.2–1.7)', () => {
  const exchanged = { csrf_token: 'tok-123', idle_timeout_s: 1800, absolute_timeout_s: 43200 };

  it('exchanges {code}, then sends the CSRF header on every request, GET included', async () => {
    const transport = vi
      .fn<Transport>()
      .mockResolvedValueOnce({ status: 200, body: exchanged })
      .mockResolvedValue({ status: 200, body: [] });
    const api = createApiClient(transport, 'live');
    const session = await api.openSession(' SYN-CODE-0001 ');
    expect(session).toMatchObject({ mode: 'live', idleTimeoutS: 1800, absoluteTimeoutS: 43200 });
    await api.listCalls();
    await api.rescoreCall('c').catch(() => undefined);
    const [exchange, get, post] = transport.mock.calls.map(([req]) => req);
    expect(exchange).toMatchObject({
      method: 'POST',
      path: '/session/exchange',
      body: { code: 'SYN-CODE-0001' },
    });
    expect(exchange?.headers).toBeUndefined();
    expect(get?.headers).toEqual({ 'X-Taqeef-CSRF': 'tok-123' });
    expect(post?.headers).toEqual({ 'X-Taqeef-CSRF': 'tok-123' });
    expect(post?.body).toMatchObject({ request_id: expect.any(String) });
    await expect(api.getSession()).resolves.toBe(session);
  });

  it('ends the session on any 401 and drops the token (no silent re-exchange)', async () => {
    const transport = vi
      .fn<Transport>()
      .mockResolvedValueOnce({ status: 200, body: exchanged })
      .mockResolvedValueOnce({ status: 401, body: { detail: 'Session expired' } })
      .mockResolvedValue({ status: 200, body: [] });
    const api = createApiClient(transport, 'live');
    const ended = vi.fn();
    api.onSessionEnded(ended);
    await api.openSession('SYN-CODE-0001');
    await expect(api.listCalls()).rejects.toMatchObject({ code: 'unauthorized' });
    expect(ended).toHaveBeenCalledTimes(1);
    await expect(api.getSession()).resolves.toBeNull();
    await api.listCalls();
    expect(transport.mock.calls[2]?.[0].headers).toBeUndefined();
    expect(transport).toHaveBeenCalledTimes(3);
  });

  it('builds the protected audio URL from the call id', () => {
    expect(createApiClient(respond(200, {}), 'live').audioSrc('DEMO 1')).toBe(
      '/api/calls/DEMO%201/audio',
    );
  });
});

describe('fetch transport', () => {
  it('uses same-origin credentials, no caching, passes headers and never reads cookies', async () => {
    document.cookie = 'csrf_token=from-cookie';
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response('{}', { status: 200 }));
    const transport = createFetchTransport(fetchImpl);
    await transport({
      method: 'GET',
      path: '/calls',
      query: { agent_id: undefined },
      headers: { 'X-Taqeef-CSRF': 'tok' },
    });
    await transport({ method: 'POST', path: '/session/exchange', body: { code: 'x' } });
    const [getUrl, getInit] = fetchImpl.mock.calls[0] ?? [];
    const [, postInit] = fetchImpl.mock.calls[1] ?? [];
    expect(getUrl).toBe('/api/calls');
    expect(getInit?.credentials).toBe('same-origin');
    expect(getInit?.cache).toBe('no-store');
    expect(getInit?.mode).toBe('same-origin');
    expect(new Headers(getInit?.headers).get('X-Taqeef-CSRF')).toBe('tok');
    expect(new Headers(postInit?.headers).get('X-Taqeef-CSRF')).toBeNull();
    expect(new Headers(postInit?.headers).get('X-CSRF-Token')).toBeNull();
  });

  it('reports network failures as network_error', async () => {
    const transport = createFetchTransport(
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline')),
    );
    await expect(transport({ method: 'GET', path: '/calls' })).rejects.toMatchObject({
      code: 'network_error',
    });
  });
});

describe('session resume and CSRF exemptions (contract v0.2.1 §D)', () => {
  it('recovers the token with GET /session first, without a CSRF header', async () => {
    const transport = vi
      .fn<Transport>()
      .mockResolvedValueOnce({ status: 200, body: { csrf_token: 'resumed' } })
      .mockResolvedValue({ status: 200, body: [] });
    const api = createApiClient(transport, 'live');
    const session = await api.resumeSession();
    expect(session).toMatchObject({ mode: 'live', idleTimeoutS: null });
    await api.listCalls();
    const [resume, next] = transport.mock.calls.map(([r]) => r);
    expect(resume).toMatchObject({ method: 'GET', path: '/session' });
    expect(resume?.headers).toBeUndefined();
    expect(next?.headers).toEqual({ 'X-Taqeef-CSRF': 'resumed' });
    // Once resumed, no further GET /session is needed.
    await expect(api.resumeSession()).resolves.toBe(session);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it('returns null on 401 and keeps no token', async () => {
    const transport = vi
      .fn<Transport>()
      .mockResolvedValueOnce({ status: 401, body: {} })
      .mockResolvedValue({ status: 200, body: [] });
    const api = createApiClient(transport, 'live');
    await expect(api.resumeSession()).resolves.toBeNull();
    await api.listCalls();
    expect(transport.mock.calls[1]?.[0].headers).toBeUndefined();
  });

  it('sends the CSRF header on every request except the exchange and GET /session', async () => {
    const transport = vi.fn<Transport>().mockImplementation(async (req) => ({
      status: 200,
      body:
        req.path === '/session/exchange'
          ? { csrf_token: 't', idle_timeout_s: 1, absolute_timeout_s: 2 }
          : [],
    }));
    const api = createApiClient(transport, 'live');
    await api.openSession('SYN-CODE-0001');
    await api.listAgents({ includeRetired: true });
    await api.listEvaluations();
    await api.retireAgent('agt 1').catch(() => undefined);
    const reqs = transport.mock.calls.map(([r]) => r);
    const exempt = reqs.filter((r) => !r.headers).map((r) => `${r.method} ${r.path}`);
    expect(exempt).toEqual(['POST /session/exchange']);
    expect(reqs[1]).toMatchObject({ path: '/agents', query: { include_retired: 'true' } });
    expect(reqs[3]).toMatchObject({ method: 'POST', path: '/agents/agt%201/retire' });
    expect(Object.keys(endpoints).filter((k) => k.startsWith('session'))).toEqual([
      'sessionExchange',
      'session',
    ]);
  });
});
