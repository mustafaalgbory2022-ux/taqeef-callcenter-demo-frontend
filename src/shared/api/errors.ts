export type ApiErrorCode =
  | 'network_error'
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'payload_too_large'
  | 'unsupported_media_type'
  | 'validation_error'
  | 'rate_limited'
  | 'contract_mismatch'
  | 'server_error'
  | 'http_error';

/** A server validation issue: a field name and a rule code. Never the submitted value. */
export interface FieldIssue {
  field: string;
  reason: string;
}

/**
 * The single error type UI code handles. `message` is an internal diagnostic and is never
 * shown to users; UI text is always localised from `code` and field reasons.
 */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    message: string,
    readonly fieldIssues: readonly FieldIssue[] = [],
    /** Server error code `<module.component.event>`, when the envelope provided one. */
    readonly serverCode: string | null = null,
    /** Server correlation id for support, when provided. */
    readonly correlationId: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const CODE_BY_STATUS: Record<number, ApiErrorCode> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  413: 'payload_too_large',
  415: 'unsupported_media_type',
  422: 'validation_error',
  429: 'rate_limited',
};

/** `<module.component.event>` (contract v0.2 item 9, CONFIRMED format). */
const SERVER_CODE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/;
const SAFE_TOKEN = /^[a-z][a-z0-9_]{0,63}$/;
const CORRELATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const field = (o: object, key: string): unknown =>
  key in o ? (o as Record<string, unknown>)[key] : undefined;

/**
 * Map the structured error envelope (contract v0.2 item 9; field names PROPOSED):
 *   {"error": {"code", "message", "correlation_id", "fields": [{"field", "reason"}]}}
 * Only codes, field names and rule codes are kept, and only when they look like identifiers,
 * so no server text or echoed input can reach the UI. Anything else falls back to the status.
 */
export function toApiError(status: number, body: unknown): ApiError {
  const code = CODE_BY_STATUS[status] ?? (status >= 500 ? 'server_error' : 'http_error');
  const env = typeof body === 'object' && body !== null ? field(body, 'error') : undefined;
  if (typeof env !== 'object' || env === null) {
    return new ApiError(code, status, `HTTP ${status}`);
  }
  const rawCode = field(env, 'code');
  const serverCode = typeof rawCode === 'string' && SERVER_CODE.test(rawCode) ? rawCode : null;
  const rawId = field(env, 'correlation_id');
  const correlationId = typeof rawId === 'string' && CORRELATION_ID.test(rawId) ? rawId : null;
  const rawFields = field(env, 'fields');
  const issues: FieldIssue[] = Array.isArray(rawFields)
    ? rawFields.flatMap((item): FieldIssue[] => {
        if (typeof item !== 'object' || item === null) return [];
        const name = field(item, 'field');
        const reason = field(item, 'reason');
        if (typeof name !== 'string' || !SAFE_TOKEN.test(name)) return [];
        return [
          {
            field: name,
            reason: typeof reason === 'string' && SAFE_TOKEN.test(reason) ? reason : 'invalid',
          },
        ];
      })
    : [];
  return new ApiError(
    code,
    status,
    `HTTP ${status}${serverCode ? ` ${serverCode}` : ''}`,
    issues,
    serverCode,
    correlationId,
  );
}
