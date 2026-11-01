import { apiConfig } from './config';
import { ApiError } from './errors';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiRequest {
  method: HttpMethod;
  path: string;
  query?: Readonly<Record<string, string | undefined>> | undefined;
  /** JSON-serialisable value or FormData (multipart upload). */
  body?: unknown;
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

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/** Same-origin fetch with session cookies and a CSRF header on state-changing requests. */
export function createFetchTransport(fetchImpl: typeof fetch = fetch): Transport {
  return async ({ method, path, query, body }) => {
    const headers = new Headers({ Accept: 'application/json' });
    let payload: BodyInit | undefined;
    if (body instanceof FormData) {
      payload = body;
    } else if (body !== undefined) {
      headers.set('Content-Type', 'application/json');
      payload = JSON.stringify(body);
    }
    if (method !== 'GET') {
      const token = readCookie(apiConfig.csrfCookieName);
      if (token) headers.set(apiConfig.csrfHeaderName, token);
    }

    let res: Response;
    try {
      res = await fetchImpl(buildUrl(apiConfig.baseUrl, path, query), {
        method,
        headers,
        body: payload ?? null,
        credentials: 'same-origin',
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
