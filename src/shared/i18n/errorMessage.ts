import { ApiError, type FieldIssue } from '@/shared/api/errors';
import type { MessageKey, MessageVars } from './translate';

const KEYS: Record<ApiError['code'], MessageKey> = {
  network_error: 'errors.network',
  bad_request: 'errors.badRequest',
  unauthorized: 'errors.unauthorized',
  forbidden: 'errors.forbidden',
  not_found: 'errors.notFound',
  conflict: 'errors.conflict',
  payload_too_large: 'errors.tooLarge',
  unsupported_media_type: 'errors.unsupportedType',
  validation_error: 'errors.validation',
  rate_limited: 'errors.rateLimited',
  contract_mismatch: 'errors.contract',
  server_error: 'errors.server',
  http_error: 'errors.generic',
};

const REASONS = [
  'required',
  'too_long',
  'out_of_range',
  'invalid_format',
  'duplicate',
  'invalid',
] as const;

type T = (key: MessageKey, vars?: MessageVars) => string;

/**
 * Localised, user-safe message. Server text is never displayed (contract v0.2 item 9);
 * a correlation id, when present, is appended as a support reference.
 */
export function describeError(error: unknown, t: T): string {
  if (error instanceof ApiError) {
    const text = t(KEYS[error.code]);
    return error.correlationId
      ? `${text} ${t('errors.reference', { id: error.correlationId })}`
      : text;
  }
  return t('errors.generic');
}

/** Localised text for a field rule code; unknown codes read as a generic invalid value. */
export function describeFieldIssue(issue: FieldIssue, t: T): string {
  const reason = (REASONS as readonly string[]).includes(issue.reason) ? issue.reason : 'invalid';
  return t(`errors.fieldReasons.${reason as (typeof REASONS)[number]}`);
}
