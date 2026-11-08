import { describe, expect, it, vi } from 'vitest';
import { CALL_STATUSES } from '@/shared/types/domain';
import { createFormatters } from '@/shared/i18n/format';
import { createApiClient } from './client';
import { endpoints } from './endpoints';
import { ApiError } from './errors';
import { createFetchTransport, type ApiRequest, type Transport } from './transport';

const REV = '0193a000-0000-7000-8000-000000000001';

/** A v0.3 call (contract §5.3). */
const wireCall = {
  call_id: 'DEMO-001',
  display_name: 'Synthetic',
  agent_id: 'agt-001',
  agent_display_name: 'Agent A',
  uploaded_at: '2026-10-20T07:12:00.000Z',
  status: 'scored',
  rejection_reason: null,
  hidden: false,
  duration_ms: 78000,
  channels: 2,
  channel_map: 'left_agent',
  current_transcript_revision_id: '0193a000-0000-7000-8000-000000000001',
  latest_run: {
    run_id: 'run-1',
    scorecard_version_id: 'scv-1',
    scorecard_version_number: 1,
    outcome: 'scored',
    display_hundredths: 900,
    below_threshold: false,
    threshold_hundredths: 700,
    completed_at: '2026-10-20T07:27:00.000Z',
  },
  latest_job: null,
};

/** Wraps array bodies in the v0.3 list shape `{items, truncated}` (§2). */
const asList = (body: unknown) => (Array.isArray(body) ? { items: body, truncated: false } : body);
const respond = (status: number, body: unknown) =>
  vi.fn<Transport>().mockResolvedValue({ status, body: asList(body) });

describe('ApiClient over a transport', () => {
  it('maps snake_case wire data to camelCase domain types', async () => {
    const transport = respond(200, [wireCall]);
    const [call] = await createApiClient(transport, 'live').listCalls({ agentId: 'agt-001' });
    expect(call).toMatchObject({
      agentId: 'agt-001',
      durationMs: 78000,
      uploadedAt: wireCall.uploaded_at,
    });
    expect(transport).toHaveBeenCalledWith({
      method: 'GET',
      path: '/calls',
      query: { agent_id: 'agt-001' },
    });
  });

  it('decodes the v0.3 call object and rejects obsolete or inconsistent fields (§5.3)', async () => {
    const [call] = await createApiClient(respond(200, [wireCall]), 'live').listCalls();
    expect(call).toMatchObject({
      id: 'DEMO-001',
      title: 'Synthetic',
      agentDisplayName: 'Agent A',
      hidden: false,
      channels: 2,
      channelMap: 'left_agent',
      rejectionReason: null,
      latestRun: { runId: 'run-1', displayHundredths: 900, belowThreshold: false },
      latestJob: null,
    });
    for (const k of ['recordedAt', 'language', 'synthetic', 'simulated', 'source', 'channelLayout'])
      expect(call).not.toHaveProperty(k);
    const bad = [
      { ...wireCall, status: 'rejected' },
      { ...wireCall, rejection_reason: 'too_short' },
      { ...wireCall, rejection_reason: 'other', status: 'rejected' },
      { ...wireCall, hidden: undefined },
      { ...wireCall, channels: 3 },
      { ...wireCall, latest_run: { ...wireCall.latest_run, display_hundredths: null } },
    ];
    for (const body of bad) {
      await expect(createApiClient(respond(200, [body]), 'live').listCalls()).rejects.toMatchObject(
        { code: 'contract_mismatch' },
      );
    }
    const [rejected] = await createApiClient(
      respond(200, [
        { ...wireCall, status: 'rejected', rejection_reason: 'too_short', latest_run: null },
      ]),
      'live',
    ).listCalls();
    expect(rejected?.rejectionReason).toBe('too_short');
  });

  it('hides with DELETE {request_id, reason?} and restores with POST {request_id} (§5.4)', async () => {
    const transport = vi
      .fn<Transport>()
      .mockResolvedValueOnce({ status: 200, body: { ...wireCall, hidden: true } })
      .mockResolvedValueOnce({ status: 200, body: { ...wireCall, hidden: true } })
      .mockResolvedValueOnce({ status: 200, body: wireCall })
      .mockResolvedValue({ status: 200, body: asList([wireCall]) });
    const api = createApiClient(transport, 'live');
    expect((await api.hideCall('DEMO 1', '  duplicate upload ')).hidden).toBe(true);
    await api.hideCall('DEMO 1');
    await api.restoreCall('DEMO 1');
    await api.listCalls({ includeHidden: true });
    const [hide, hideNoReason, restore, list] = transport.mock.calls.map(([r]) => r);
    expect(hide).toMatchObject({
      method: 'DELETE',
      path: '/calls/DEMO%201',
      body: { request_id: expect.any(String), reason: 'duplicate upload' },
    });
    expect(Object.keys(hideNoReason?.body as object)).toEqual(['request_id']);
    expect(restore).toMatchObject({
      method: 'POST',
      path: '/calls/DEMO%201/restore',
      body: { request_id: expect.any(String) },
    });
    // Each user action gets its own request id.
    const ids = [hide, hideNoReason, restore].map(
      (r) => (r?.body as { request_id: string }).request_id,
    );
    expect(new Set(ids).size).toBe(3);
    expect(list).toMatchObject({ query: { include_hidden: 'true' } });
  });

  it('decodes the v0.3 list shape and rejects bare arrays (§2)', async () => {
    const bare = vi.fn<Transport>().mockResolvedValue({ status: 200, body: [wireCall] });
    await expect(createApiClient(bare, 'live').listCalls()).rejects.toMatchObject({
      code: 'contract_mismatch',
    });
    const truncated = vi
      .fn<Transport>()
      .mockResolvedValue({ status: 200, body: { items: [wireCall], truncated: true } });
    await expect(createApiClient(truncated, 'live').listCalls()).resolves.toHaveLength(1);
  });

  it('requires UTC timestamps with milliseconds and Z (contract v0.2 item 4)', async () => {
    for (const recorded_at of ['2026-10-20T10:12:00+03:00', '2026-10-20T07:12:00Z', '2026-10-20']) {
      await expect(
        createApiClient(
          respond(200, [{ ...wireCall, uploaded_at: recorded_at }]),
          'live',
        ).listCalls(),
      ).rejects.toMatchObject({ code: 'contract_mismatch' });
    }
  });

  it('decodes all twelve confirmed call statuses and rejects others', async () => {
    for (const status of CALL_STATUSES) {
      const [call] = await createApiClient(
        respond(200, [
          { ...wireCall, status, rejection_reason: status === 'rejected' ? 'unreadable' : null },
        ]),
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
      scorecard_version_id: 'scv-3',
      status: 'active',
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
      .mockResolvedValueOnce({ status: 200, body: asList([{ ...version, version: 2 }, version]) });
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
      .createAgent({ displayName: ' Agent E ' })
      .catch(() => undefined);
    const req = transport.mock.calls[0]?.[0] as ApiRequest;
    // Contract v0.3 §4.2: exactly {request_id, display_name}; no status, no extension.
    expect(req.body).toEqual({ request_id: expect.any(String), display_name: 'Agent E' });
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
    points_awarded_sum: 7,
    points_possible_sum: 10,
    unit: 1,
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
      respond(200, [
        {
          ...run,
          points_awarded_sum: 699,
          points_possible_sum: 1000,
          display_hundredths: 699,
          overall_score: 7.0,
        },
      ]),
      'live',
    ).listEvaluations();
    expect(e).toMatchObject({ displayHundredths: 699, belowThreshold: false });
    expect(e).not.toHaveProperty('overallScore');
  });

  it('decodes half-point units and displays them as points, not scores', async () => {
    const [e] = await createApiClient(
      respond(200, [
        {
          ...run,
          unit: 2,
          points_awarded_sum: 13,
          points_possible_sum: 20,
          possible_points: 20,
          minimum_assessable_points: 12,
          display_hundredths: 650,
        },
      ]),
      'live',
    ).listEvaluations();
    expect(e).toMatchObject({
      unit: 2,
      awardedUnits: 13,
      assessableUnits: 20,
      displayHundredths: 650,
    });
    const fmt = createFormatters('en');
    expect(fmt.points(13, 2)).toBe('6.5');
    expect(fmt.points(20, 2)).toBe('10');
    expect(fmt.points(3, 1)).toBe('3');
  });

  it('rejects missing or inconsistent point fields', async () => {
    const bad = [
      { ...run, points_awarded_sum: undefined },
      { ...run, points_possible_sum: undefined },
      { ...run, unit: 3 },
      { ...run, unit: undefined },
      { ...run, points_awarded_sum: 7.5 },
      { ...run, points_awarded_sum: 11 },
      // display_hundredths must equal floor(1000·A/P) (M2 CHECK).
      { ...run, display_hundredths: 701 },
      { ...run, points_possible_sum: 0, points_awarded_sum: 0, display_hundredths: 0 },
    ];
    for (const body of bad) {
      await expect(
        createApiClient(respond(200, [body]), 'live').listEvaluations(),
      ).rejects.toMatchObject({ code: 'contract_mismatch' });
    }
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
      points_awarded_sum: 0,
      points_possible_sum: 0,
      unit: 1,
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
      .createAgent({ displayName: 'Agent X' })
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

  it('keeps only error codes with exactly three parts (contract v0.3 §12.1)', async () => {
    const env = (code: string) => ({
      error: { code, message: 'x', correlation_id: null, fields: [] },
    });
    const ok = await createApiClient(respond(409, env('api.state.conflict')), 'live')
      .listCalls()
      .catch((e: unknown) => e);
    expect(ok).toMatchObject({ serverCode: 'api.state.conflict' });
    const four = await createApiClient(respond(409, env('api.state.conflict.extra')), 'live')
      .listCalls()
      .catch((e: unknown) => e);
    expect(four).toMatchObject({ serverCode: null, code: 'conflict' });
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
      .mockResolvedValue({ status: 200, body: asList([]) });
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
      .mockResolvedValue({ status: 200, body: asList([]) });
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

  it('decodes v0.3 agents and retires with {request_id} only (§4)', async () => {
    const transport = vi.fn<Transport>().mockResolvedValue({
      status: 200,
      body: {
        items: [
          {
            agent_id: 'agt-1',
            display_name: 'Agent A',
            created_at: '2026-11-05T09:30:00.000Z',
            retired_at: null,
          },
          {
            agent_id: 'agt-2',
            display_name: 'Agent B',
            created_at: '2026-11-05T09:30:00.000Z',
            retired_at: '2026-11-06T09:30:00.000Z',
          },
        ],
        truncated: false,
      },
    });
    const api = createApiClient(transport, 'live');
    const list = await api.listAgents({ includeRetired: true });
    expect(list.map((a) => [a.id, a.status])).toEqual([
      ['agt-1', 'active'],
      ['agt-2', 'retired'],
    ]);
    expect(list[0]).not.toHaveProperty('extension');
    await api.retireAgent('agt-1').catch(() => undefined);
    expect(transport.mock.calls[1]?.[0]).toMatchObject({
      method: 'POST',
      path: '/agents/agt-1/retire',
      body: { request_id: expect.any(String) },
    });
    expect(Object.keys((transport.mock.calls[1]?.[0].body ?? {}) as object)).toEqual([
      'request_id',
    ]);
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
      .mockResolvedValue({ status: 200, body: asList([]) });
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
      .mockResolvedValue({ status: 200, body: asList([]) });
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
          : { items: [], truncated: false },
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
