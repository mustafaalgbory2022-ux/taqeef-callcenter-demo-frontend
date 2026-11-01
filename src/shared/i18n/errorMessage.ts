import { ApiError } from '@/shared/api/errors';
import type { MessageKey } from './translate';

const KEYS: Record<ApiError['code'], MessageKey> = {
  network_error: 'errors.network',
  unauthorized: 'errors.unauthorized',
  forbidden: 'errors.forbidden',
  not_found: 'errors.notFound',
  validation_error: 'errors.validation',
  conflict: 'errors.conflict',
  contract_mismatch: 'errors.contract',
  server_error: 'errors.server',
  http_error: 'errors.generic',
};

/** Localised, user-safe message. Raw server text is shown only for 4xx detail strings. */
export function describeError(error: unknown, t: (key: MessageKey) => string): string {
  if (error instanceof ApiError) {
    if (
      (error.code === 'conflict' || error.code === 'not_found') &&
      error.message &&
      !error.message.startsWith('HTTP')
    ) {
      return error.message;
    }
    return t(KEYS[error.code]);
  }
  return t('errors.generic');
}
