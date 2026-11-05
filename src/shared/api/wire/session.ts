import { nullable, num, object, str, type Decoded } from '../decode';

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

/**
 * `GET /api/session` (contract v0.2.1 §D, PROPOSED): returns the existing session's CSRF token
 * so a reload keeps the session. The body is only described as carrying the token; the field
 * name `csrf_token` is assumed to match the exchange response, and timeouts are optional.
 */
export const wireSessionResume = object({
  csrf_token: str,
  idle_timeout_s: nullable(num),
  absolute_timeout_s: nullable(num),
});
