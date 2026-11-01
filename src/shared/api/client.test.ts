import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client';
import { ApiError } from './errors';
import { createFetchTransport, type ApiRequest, type Transport } from './transport';

const wireCall = {
  id: 'DEMO-001',
  title: 'Synthetic',
  agent_id: 'agt-001',
  queue_id: null,
  language: 'ar',
  duration_ms: 78000,
  recorded_at: '2026-10-20T10:12:00+03:00',
  status: 'scored',
  audio_url: null,
  synthetic: true,
  simulated: false,
  source: 'fixture',
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

  it('treats 401 on GET /session as "no session"', async () => {
    await expect(
      createApiClient(respond(401, { detail: 'No session' }), 'live').getSession(),
    ).resolves.toBeNull();
  });
});

describe('fetch transport', () => {
  it('uses same-origin credentials and sends the CSRF header on writes only', async () => {
    document.cookie = 'csrf_token=abc123';
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response('{}', { status: 200 }));
    const transport = createFetchTransport(fetchImpl);
    await transport({ method: 'GET', path: '/calls', query: { agent_id: undefined } });
    await transport({ method: 'POST', path: '/calls/x/rescore' });
    const [getUrl, getInit] = fetchImpl.mock.calls[0] ?? [];
    const [, postInit] = fetchImpl.mock.calls[1] ?? [];
    expect(getUrl).toBe('/api/calls');
    expect(getInit?.credentials).toBe('same-origin');
    expect(new Headers(getInit?.headers).get('X-CSRF-Token')).toBeNull();
    expect(new Headers(postInit?.headers).get('X-CSRF-Token')).toBe('abc123');
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
