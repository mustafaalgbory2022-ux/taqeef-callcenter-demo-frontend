import type { z } from 'zod';
import { ApiErrorSchema, type ApiErrorBody } from './contract';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = body.status;
    this.code = body.code;
    this.details = body.details;
  }
}

export interface HttpOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

/** Map FastAPI error payloads ({detail: string | ValidationError[]}) to ApiError. */
async function toApiError(res: Response): Promise<ApiError> {
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON error body */
  }
  const direct = ApiErrorSchema.safeParse(payload);
  if (direct.success) return new ApiError(direct.data);
  const detail =
    payload && typeof payload === 'object' && 'detail' in payload ? payload.detail : undefined;
  return new ApiError({
    status: res.status,
    code: res.status === 422 ? 'validation_error' : `http_${res.status}`,
    message: typeof detail === 'string' ? detail : res.statusText || 'Request failed',
    details: detail,
  });
}

export function createHttp({ baseUrl, fetchImpl }: HttpOptions) {
  const base = baseUrl.replace(/\/$/, '');

  async function request<T>(
    schema: z.ZodType<T>,
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    let res: Response;
    try {
      res = await doFetch(`${base}${path}`, { ...init, headers });
    } catch (cause) {
      throw new ApiError({
        status: 0,
        code: 'network_error',
        message: 'Network error',
        details: cause,
      });
    }
    if (!res.ok) throw await toApiError(res);
    const json: unknown = res.status === 204 ? null : await res.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError({
        status: res.status,
        code: 'contract_mismatch',
        message: `Response for ${path} does not match the frontend contract`,
        details: parsed.error.issues,
      });
    }
    return parsed.data;
  }

  return { request };
}
