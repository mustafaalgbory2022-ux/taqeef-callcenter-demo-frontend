import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client';
import { ApiError } from './http';

const call = {
  id: 'DEMO-001',
  title: 'Synthetic call',
  agentAlias: 'AG-01',
  queue: 'billing',
  direction: 'inbound',
  language: 'ar',
  durationMs: 1000,
  recordedAt: '2026-01-01T10:00:00+03:00',
  status: 'scored',
  audioUrl: null,
  synthetic: true,
};

const respond = (status: number, body: unknown) =>
  vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

describe('ApiClient', () => {
  it('requests the base URL + endpoint and validates the response', async () => {
    const fetchImpl = respond(200, [call]);
    const client = createApiClient('fastapi', { baseUrl: '/api/', fetchImpl });
    await expect(client.listCalls()).resolves.toEqual([call]);
    expect(fetchImpl).toHaveBeenCalledWith('/api/calls', expect.any(Object));
  });

  it('rejects responses that break the contract', async () => {
    const client = createApiClient('fastapi', {
      baseUrl: '/api',
      fetchImpl: respond(200, [{ ...call, durationMs: 'long' }]),
    });
    await expect(client.listCalls()).rejects.toMatchObject({ code: 'contract_mismatch' });
  });

  it('maps FastAPI {detail} errors to ApiError', async () => {
    const client = createApiClient('fastapi', {
      baseUrl: '/api',
      fetchImpl: respond(404, { detail: 'Call not found' }),
    });
    const err = await client.getCall('x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 404, code: 'http_404', message: 'Call not found' });
  });

  it('maps network failures to a network_error', async () => {
    const client = createApiClient('fastapi', {
      baseUrl: '/api',
      fetchImpl: vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline')),
    });
    await expect(client.listCalls()).rejects.toMatchObject({ status: 0, code: 'network_error' });
  });

  it('encodes path parameters', async () => {
    const fetchImpl = respond(200, call);
    await createApiClient('fastapi', { baseUrl: '/api', fetchImpl }).getCall('a/b');
    expect(fetchImpl).toHaveBeenCalledWith('/api/calls/a%2Fb', expect.any(Object));
  });
});
