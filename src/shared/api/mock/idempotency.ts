import type { ApiResponse } from '../transport';
import { fail } from './router';
import type { MockState } from './types';

/**
 * SIMULATED request-id replay (contract v0.3 §2.1, behaviour CONFIRMED):
 * - a new `request_id` runs the action; only completed (2xx) outcomes are recorded;
 * - the same `request_id` on the same route returns the original status with the current
 *   state of the entity, and never repeats the side effect;
 * - the same `request_id` on a different route is a 409 `request_id_conflict`.
 * The real server also hashes the non-sensitive payload; the mock keys on the route only.
 */
export function idempotent(
  state: MockState,
  requestId: string,
  route: string,
  run: () => ApiResponse,
  current: () => unknown,
): ApiResponse {
  const seen = state.requests[requestId];
  if (seen) {
    if (seen.route !== route) {
      return fail(409, 'Request id already used.', [
        { field: 'request_id', reason: 'request_id_conflict' },
      ]);
    }
    return { status: seen.status, body: current() };
  }
  const res = run();
  if (res.status < 300) state.requests[requestId] = { route, status: res.status };
  return res;
}
