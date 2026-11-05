import { ApiError } from '../errors';
import type { ApiRequest, ApiResponse, Transport } from '../transport';
import { cachedAudioUrl, synthesizeCallAudio } from './audio';
import { clearSavedState, loadState, saveState } from './db';
import { agentRoutes } from './handlers/agents';
import { callRoutes } from './handlers/calls';
import { evaluationRoutes } from './handlers/evaluations';
import { scorecardRoutes } from './handlers/scorecards';
import { fail, findRoute, ok, type Route } from './router';

const USED_CODES_KEY = 'taqeef.mock.usedCodes';
const LAUNCH_CODE = /^[A-Z0-9-]{8,64}$/i;
/** Same header as the live contract (1.7), compared on every non-exempt mock route. */
const CSRF_HEADER = 'X-Taqeef-CSRF';

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** A fresh synthetic one-time launch code for the mock "Open local demo session" flow. */
export function issueSyntheticLaunchCode(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SYN-${rand}-DEMO`;
}

/** Discard all simulated changes and return to the seeded synthetic dataset. */
export function resetMockData(): void {
  clearSavedState();
}

export interface MockTransportOptions {
  latencyMs?: number;
}

export interface MockBackend {
  transport: Transport;
  /** Synthetic in-browser audio stands in for the protected audio route. */
  audioSrc: (callId: string) => string | null;
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function headerOf(req: ApiRequest, name: string): string | undefined {
  const key = Object.keys(req.headers ?? {}).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? req.headers?.[key] : undefined;
}

/**
 * In-browser SIMULATED backend speaking the same wire format as the FastAPI adapter. It
 * mirrors the confirmed session rules: one-time launch codes, a CSRF token returned by the
 * exchange and required on every other route (GET included); the session lives only as long
 * as this page (a reload needs a new launch code).
 */
export function createMockBackend({ latencyMs = 160 }: MockTransportOptions = {}): MockBackend {
  const state = loadState();
  const persist = () => saveState(state);
  let csrfToken: string | null = null;

  const sessionRoutes: Route[] = [
    {
      method: 'POST',
      pattern: '/session/exchange',
      public: true,
      handler: ({ body }) => {
        const code =
          typeof body === 'object' && body !== null && 'code' in body ? String(body.code) : '';
        if (!LAUNCH_CODE.test(code)) return fail(400, 'Malformed launch code.');
        const used: string[] = JSON.parse(storage()?.getItem(USED_CODES_KEY) ?? '[]');
        if (used.includes(code)) return fail(401, 'This launch code has already been used.');
        storage()?.setItem(USED_CODES_KEY, JSON.stringify([...used, code]));
        csrfToken = randomToken();
        return ok({ csrf_token: csrfToken, idle_timeout_s: 1800, absolute_timeout_s: 43200 });
      },
    },
    {
      method: 'GET',
      pattern: '/branding',
      handler: () =>
        ok({
          product_name: null,
          organization_name: null,
          logo_light_url: null,
          logo_dark_url: null,
          tokens: { light: null, dark: null },
        }),
    },
  ];

  const routes: Route[] = [
    ...sessionRoutes,
    ...agentRoutes(state, persist),
    ...callRoutes(state, persist),
    ...evaluationRoutes(state, persist),
    ...scorecardRoutes(state, persist),
  ];

  const transport: Transport = async (req) => {
    await new Promise((resolve) => setTimeout(resolve, latencyMs));
    const found = findRoute(routes, req);
    let res: ApiResponse;
    if (!found) res = fail(404, `No mock route for ${req.method} ${req.path}`);
    else if (!found.route.public && csrfToken === null) res = fail(401, 'No session.');
    else if (!found.route.public && headerOf(req, CSRF_HEADER) !== csrfToken)
      res = fail(403, 'Missing or invalid CSRF token.');
    else {
      try {
        res = found.route.handler({ params: found.params, query: req.query ?? {}, body: req.body });
      } catch {
        throw new ApiError('server_error', 500, 'Simulated backend error');
      }
    }
    // Responses are copies so UI code can never mutate simulated server state.
    return { status: res.status, body: structuredClone(res.body) };
  };

  const audioSrc = (callId: string): string | null => {
    const call = state.calls.find((c) => c.id === callId);
    if (!call) return null;
    if (call.source === 'upload') return cachedAudioUrl(call.id);
    const transcript = state.transcripts[call.id];
    return transcript && call.duration_ms
      ? synthesizeCallAudio(call.id, call.duration_ms, transcript.segments)
      : null;
  };

  return { transport, audioSrc };
}

/** Transport only (tests). */
export function createMockTransport(options: MockTransportOptions = {}): Transport {
  return createMockBackend(options).transport;
}
