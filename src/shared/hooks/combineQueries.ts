import type { QueryResult } from './useApiQuery';

/** Distributes over the result union and keeps the success data type. */
type DataOf<Q> = Exclude<Q extends { data: infer D } ? D : never, undefined>;
type Combined<Q extends readonly QueryResult<unknown>[]> = {
  -readonly [K in keyof Q]: DataOf<Q[K]>;
};

/** Merge several queries into one loading / error / success state with tuple data. */
export function combineQueries<const Q extends readonly QueryResult<unknown>[]>(
  queries: Q,
): QueryResult<Combined<Q>> {
  const refetch = () => queries.forEach((q) => q.refetch());
  const stale = queries.some((q) => q.stale);
  if (queries.every((q) => q.data !== undefined)) {
    const data = queries.map((q) => q.data) as Combined<Q>;
    return { status: 'success', data, error: undefined, stale, refetch };
  }
  const failed = queries.find((q) => q.status === 'error');
  if (failed) return { status: 'error', data: undefined, error: failed.error, stale, refetch };
  return { status: 'loading', data: undefined, error: undefined, stale, refetch };
}
