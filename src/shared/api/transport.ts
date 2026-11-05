import { apiConfig } from './config';
import { ApiError } from './errors';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiRequest {
  method: HttpMethod;
  path: string;
  query?: Readonly<Record<string, string | undefined>> | undefined;
  /** JSON-serialisable value or FormData (multipart upload). */
  body?: unknown;
  /** Set by the ApiClient (e.g. the CSRF header). */
  headers?: Readonly<Record<string, string>> | undefined;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

/** Everything below the ApiClient. The mock backend implements this same interface. */
export type Transport = (request: ApiRequest) => Promise<ApiResponse>;

export function buildUrl(baseUrl: string, path: string, query?: ApiRequest['query']): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') params.set(key, value);
  }
  const qs = params.toString();
  return `${baseUrl.replace(/\/$/, '')}${path}${qs ? `?${qs}` : ''}`;
}

/**
 * Same-origin fetch. The session cookie is HttpOnly and sent by the browser; this code never
 * reads cookies. Headers (CSRF) come from the ApiClient, which holds the token in memory.
 */
export function createFetchTransport(fetchImpl: typeof fetch = fetch): Transport {
  return async ({ method, path, query, body, headers: extra }) => {
    const headers = new Headers({ Accept: 'application/json', ...extra });
    let payload: BodyInit | undefined;
    if (body instanceof FormData) {
      payload = body;
    } else if (body !== undefined) {
      headers.set('Content-Type', 'application/json');
      payload = JSON.stringify(body);
    }

    let res: Response;
    try {
      res = await fetchImpl(buildUrl(apiConfig.baseUrl, path, query), {
        method,
        headers,
        body: payload ?? null,
        credentials: 'same-origin',
        cache: 'no-store',
      });
    } catch {
      throw new ApiError('network_error', 0, 'Network error');
    }
    const text = await res.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
    return { status: res.status, body: json };
  };
}
