import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client';
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
  recorded_at: '2026-10-20T10:12:00+03:00',
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

  it('sends snake_case request bodies', async () => {
    const transport = respond(201, { ...wireCall });
    await createApiClient(transport, 'live')
      .createAgent({
        displayName: ' Agent E ',
        extension: 'SYN-105',
        status: 'active',
        queueIds: ['q'],
      })
      .catch(() => undefined);
    const req = transport.mock.calls[0]?.[0] as ApiRequest;
    expect(req.body).toEqual({
      display_name: 'Agent E',
      extension: 'SYN-105',
      status: 'active',
      queue_ids: ['q'],
    });
  });

  it('rejects responses that break the contract', async () => {
    const client = createApiClient(respond(200, [{ ...wireCall, duration_ms: 'long' }]), 'live');
    await expect(client.listCalls()).rejects.toMatchObject({ code: 'contract_mismatch' });
  });

  it('rejects out-of-range scores and scored criteria without a score', async () => {
    const evaluation = {
      id: 'e',
      call_id: 'c',
      agent_id: null,
      scorecard_id: 's',
      scorecard_version: 1,
      status: 'completed',
      outcome: 'scored',
      awarded_points: 8,
      assessable_points: 10,
      possible_points: 10,
      minimum_assessable_points: 6,
      overall_score: 85,
      criteria: [],
      prohibited_hits: [],
      trigger: 'initial',
      supersedes_id: null,
      created_at: '2026-10-01T00:00:00Z',
      simulated: false,
    };
    const badCriterion = {
      criterion_id: 'a',
      result: 'scored',
      score: null,
      rationale: '',
      evidence: [],
    };
    await expect(
      createApiClient(respond(200, [evaluation]), 'live').listEvaluations(),
    ).rejects.toMatchObject({
      code: 'contract_mismatch',
    });
    await expect(
      createApiClient(
        respond(200, [{ ...evaluation, overall_score: 8, criteria: [badCriterion] }]),
        'live',
      ).listEvaluations(),
    ).rejects.toMatchObject({ code: 'contract_mismatch' });
  });

  it('rejects an insufficient-evidence outcome that still carries a score', async () => {
    const evaluation = {
      id: 'e',
      call_id: 'c',
      agent_id: null,
      scorecard_id: 's',
      scorecard_version: 1,
      status: 'completed',
      outcome: 'insufficient_evidence',
      awarded_points: 3,
      assessable_points: 4,
      possible_points: 10,
      minimum_assessable_points: 6,
      overall_score: 7.5,
      criteria: [],
      prohibited_hits: [],
      trigger: 'initial',
      supersedes_id: null,
      created_at: '2026-10-01T00:00:00Z',
      simulated: false,
    };
    await expect(
      createApiClient(respond(200, [evaluation]), 'live').listEvaluations(),
    ).rejects.toMatchObject({
      code: 'contract_mismatch',
    });
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
      overall_score: null,
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
    expect(na).toMatchObject({ outcome: 'not_assessable', overallScore: null });
  });

  it('rejects evidence ids and revision ids outside the confirmed formats', async () => {
    const api = createApiClient(
      respond(200, { call_id: 'c', transcript_revision_id: 'rev-1', revision_no: 0, segments: [] }),
      'live',
    );
    await expect(api.getTranscript('rev-1')).rejects.toMatchObject({ code: 'contract_mismatch' });
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
    await expect(segApi.getTranscript(REV)).rejects.toMatchObject({ code: 'contract_mismatch' });
  });

  it('maps FastAPI 422 details to field issues', async () => {
    const detail = [{ loc: ['body', 'extension', 0], msg: 'Already used', type: 'value_error' }];
    const err = await createApiClient(respond(422, { detail }), 'live')
      .updateAgent('a', { extension: 'x' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      code: 'validation_error',
      fieldIssues: [{ field: 'extension', message: 'Already used' }],
    });
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
