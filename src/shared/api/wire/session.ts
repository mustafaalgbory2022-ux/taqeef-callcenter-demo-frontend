import { num, object, str, type Decoded } from '../decode';

/**
 * `POST /api/session/exchange` response (contract 1.3, field names PROPOSED). The CSRF token
 * is kept in memory by the ApiClient and never stored or logged.
 */
export const wireSessionExchange = object({
  csrf_token: str,
  idle_timeout_s: num,
  absolute_timeout_s: num,
});

export type WireSessionExchange = Decoded<typeof wireSessionExchange>;
