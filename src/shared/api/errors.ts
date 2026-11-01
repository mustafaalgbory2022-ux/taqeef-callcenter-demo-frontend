export type ApiErrorCode =
  | 'network_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_error'
  | 'conflict'
  | 'contract_mismatch'
  | 'server_error'
  | 'http_error';

export interface FieldIssue {
  field: string;
  message: string;
}

/** The single error type UI code handles. */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    message: string,
    readonly fieldIssues: readonly FieldIssue[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const CODE_BY_STATUS: Record<number, ApiErrorCode> = {
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'validation_error',
};

/**
 * Map FastAPI-style error bodies to ApiError:
 *   {"detail": "text"} or 422 {"detail": [{"loc": [...], "msg": "..."}]}
 */
export function toApiError(status: number, body: unknown): ApiError {
  const code = CODE_BY_STATUS[status] ?? (status >= 500 ? 'server_error' : 'http_error');
  const detail =
    typeof body === 'object' && body !== null && 'detail' in body ? body.detail : undefined;

  if (Array.isArray(detail)) {
    const issues = detail.flatMap((item): FieldIssue[] => {
      if (typeof item !== 'object' || item === null) return [];
      const loc: unknown[] = 'loc' in item && Array.isArray(item.loc) ? item.loc : [];
      const msg = 'msg' in item && typeof item.msg === 'string' ? item.msg : 'Invalid value';
      // ['body', 'queue_ids', 0] → 'queue_ids'; model-level errors → ''.
      const field = String(loc.filter((p) => p !== 'body' && p !== 'query')[0] ?? '');
      return [{ field, message: msg }];
    });
    return new ApiError(code, status, 'Validation failed', issues);
  }
  return new ApiError(code, status, typeof detail === 'string' ? detail : `HTTP ${status}`);
}
