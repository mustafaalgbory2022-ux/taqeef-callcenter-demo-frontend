import type { ApiRequest, ApiResponse, HttpMethod } from '../transport';

export interface RouteContext {
  params: Record<string, string>;
  query: Readonly<Record<string, string | undefined>>;
  body: unknown;
}

export type Handler = (ctx: RouteContext) => ApiResponse;

export interface Route {
  method: HttpMethod;
  pattern: string;
  handler: Handler;
  /** Routes that work without a session (e.g. the launch-code exchange). */
  public?: boolean;
}

export const ok = (body: unknown): ApiResponse => ({ status: 200, body });
export const created = (body: unknown): ApiResponse => ({ status: 201, body });

/** Rule codes the simulated backend uses in field errors. */
export type FieldReason =
  'required' | 'too_long' | 'out_of_range' | 'invalid_format' | 'duplicate' | 'invalid';

const correlationId = () => crypto.randomUUID();

/**
 * Structured error envelope (contract v0.2 item 9). `message` is fixed safe text; nothing
 * submitted by the client is echoed.
 */
export const fail = (
  status: number,
  message: string,
  fields: { field: string; reason: FieldReason }[] = [],
): ApiResponse => ({
  status,
  body: {
    error: {
      code: `demo.mock.http_${status}`,
      message,
      correlation_id: correlationId(),
      fields,
    },
  },
});
export const invalid = (field: string, reason: FieldReason): ApiResponse =>
  fail(422, 'Validation failed.', [{ field, reason }]);

function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/');
  const a = path.split('/');
  if (p.length !== a.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    const part = p[i] ?? '';
    const actual = a[i] ?? '';
    if (part.startsWith(':')) params[part.slice(1)] = decodeURIComponent(actual);
    else if (part !== actual) return null;
  }
  return params;
}

export function findRoute(
  routes: readonly Route[],
  req: ApiRequest,
): { route: Route; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== req.method) continue;
    const params = match(route.pattern, req.path);
    if (params) return { route, params };
  }
  return null;
}
