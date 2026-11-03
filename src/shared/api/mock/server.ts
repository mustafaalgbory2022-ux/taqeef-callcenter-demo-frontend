import { ApiError } from '../errors';
import type { ApiResponse, Transport } from '../transport';
import { clearSavedState, loadState, saveState } from './db';
import { agentRoutes } from './handlers/agents';
import { aiRoutes } from './handlers/ai';
import { dictionaryRoutes } from './handlers/dictionary';
import { notificationRoutes } from './handlers/notifications';
import { pbxRoutes } from './handlers/pbx';
import { reportSettingsRoutes } from './handlers/reportSettings';
import { backupRoutes } from './handlers/backups';
import { storageRoutes } from './handlers/storage';
import { userRoutes } from './handlers/users';
import { callRoutes } from './handlers/calls';
import { evaluationRoutes } from './handlers/evaluations';
import { scorecardRoutes } from './handlers/scorecards';
import { operationsRoutes } from './handlers/operations';
import { auditRoutes, queueRoutes } from './handlers/queues';
import { addGeneratedData } from './generate';
import { fail, findRoute, ok, type Route } from './router';

const SESSION_KEY = 'taqeef.mock.session';
const USED_CODES_KEY = 'taqeef.mock.usedCodes';
const LAUNCH_CODE = /^[A-Z0-9-]{8,64}$/i;

const syntheticSession = {
  mode: 'mock',
  user_id: 'usr-admin',
  display_name: 'Synthetic administrator',
  permissions: [
    'agents.manage',
    'scorecards.manage',
    'calls.upload',
    'evaluations.rescore',
    'calls.review',
    'reports.export',
    'reports.manage',
    'settings.manage',
    'queues.manage',
    'ai.manage',
    'dictionary.manage',
    'dictionary.review',
    'pbx.manage',
    'notifications.manage',
    'users.manage',
    'security.manage',
    'storage.manage',
    'backups.manage',
    'system.view',
    'audit.view',
    'audit.export',
    'branding.manage',
  ],
  expires_at: null,
};

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

/** In-browser SIMULATED backend speaking the same wire format as the FastAPI adapter. */
export function createMockTransport({ latencyMs = 160 }: MockTransportOptions = {}): Transport {
  const state = loadState();
  const generated = addGeneratedData(state);
  const persist = () => saveState(state);

  const sessionRoutes: Route[] = [
    {
      method: 'GET',
      pattern: '/session',
      public: true,
      handler: () =>
        storage()?.getItem(SESSION_KEY) ? ok(syntheticSession) : fail(401, 'No session.'),
    },
    {
      method: 'POST',
      pattern: '/session/launch',
      public: true,
      handler: ({ body }) => {
        const code =
          typeof body === 'object' && body !== null && 'launch_code' in body
            ? String(body.launch_code)
            : '';
        if (!LAUNCH_CODE.test(code))
          return fail(422, [{ loc: ['body', 'launch_code'], msg: 'Invalid launch code.' }]);
        const used: string[] = JSON.parse(storage()?.getItem(USED_CODES_KEY) ?? '[]');
        if (used.includes(code)) return fail(401, 'This launch code has already been used.');
        storage()?.setItem(USED_CODES_KEY, JSON.stringify([...used, code]));
        storage()?.setItem(SESSION_KEY, '1');
        return ok(syntheticSession);
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
    ...operationsRoutes(state, generated, persist),
    ...queueRoutes(state, persist),
    ...auditRoutes(state, persist),
    ...aiRoutes(state, persist),
    ...dictionaryRoutes(state, persist),
    ...pbxRoutes(state, generated, persist),
    ...notificationRoutes(state, persist),
    ...reportSettingsRoutes(state, persist),
    ...userRoutes(state, syntheticSession.permissions, persist),
    ...storageRoutes(state, persist),
    ...backupRoutes(state, persist),
  ];

  return async (req) => {
    await new Promise((resolve) => setTimeout(resolve, latencyMs));
    const found = findRoute(routes, req);
    let res: ApiResponse;
    if (!found) res = fail(404, `No mock route for ${req.method} ${req.path}`);
    else if (!found.route.public && !storage()?.getItem(SESSION_KEY))
      res = fail(401, 'No session.');
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
}
