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
export const fail = (status: number, detail: unknown): ApiResponse => ({
  status,
  body: { detail },
});
export const invalid = (field: string, msg: string): ApiResponse =>
  fail(422, [{ loc: ['body', field], msg, type: 'value_error' }]);

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
