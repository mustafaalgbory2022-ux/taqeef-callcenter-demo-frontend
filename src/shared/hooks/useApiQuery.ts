import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { ApiClient } from '@/shared/api/client';
import { useApiContext } from '@/shared/api/ApiProvider';
import type { QueryState } from '@/shared/api/queryStore';

export interface QueryOptions<T> {
  enabled?: boolean;
  /** Poll while mounted; may depend on the latest data (e.g. stop when processing ends). */
  refetchIntervalMs?: number | ((data: T | undefined) => number | undefined) | undefined;
}

export type QueryResult<T> = QueryState<T> & { refetch: () => void };

/**
 * Read data through the ApiClient with caching. `key` identifies the data; its first
 * element is the invalidation prefix (e.g. ['calls', agentId]).
 */
export function useApiQuery<T>(
  key: readonly unknown[],
  fetcher: (api: ApiClient) => Promise<T>,
  { enabled = true, refetchIntervalMs }: QueryOptions<T> = {},
): QueryResult<T> {
  const { client, store } = useApiContext();
  const keyStr = JSON.stringify(key);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const subscribe = useCallback((cb: () => void) => store.subscribe(keyStr, cb), [store, keyStr]);
  const state = useSyncExternalStore(subscribe, () => store.snapshot<T>(keyStr));

  const run = useCallback(() => {
    void store.fetch(keyStr, () => fetcherRef.current(client));
  }, [store, keyStr, client]);

  useEffect(() => {
    if (enabled && state.stale) run();
  }, [enabled, state.stale, run]);

  const interval =
    typeof refetchIntervalMs === 'function' ? refetchIntervalMs(state.data) : refetchIntervalMs;
  useEffect(() => {
    if (!enabled || !interval) return;
    const id = window.setInterval(run, interval);
    return () => window.clearInterval(id);
  }, [enabled, interval, run]);

  return { ...state, refetch: run };
}
