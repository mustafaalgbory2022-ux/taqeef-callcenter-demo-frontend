/**
 * Minimal query cache: deduplicates requests, shares results between components and
 * supports prefix invalidation after mutations. Deliberately small instead of a library.
 */
export type QueryState<T> =
  | { status: 'loading'; data: undefined; error: undefined; stale: boolean }
  | { status: 'error'; data: T | undefined; error: unknown; stale: boolean }
  | { status: 'success'; data: T; error: undefined; stale: boolean };

const LOADING: QueryState<never> = {
  status: 'loading',
  data: undefined,
  error: undefined,
  stale: true,
};

export class QueryStore {
  private entries = new Map<string, QueryState<unknown>>();
  private inflight = new Map<string, Promise<void>>();
  /** Bumped on invalidation so results of fetches started earlier are not treated as fresh. */
  private generation = new Map<string, number>();
  private listeners = new Map<string, Set<() => void>>();

  snapshot<T>(key: string): QueryState<T> {
    return (this.entries.get(key) ?? LOADING) as QueryState<T>;
  }

  subscribe(key: string, listener: () => void): () => void {
    const set = this.listeners.get(key) ?? new Set();
    set.add(listener);
    this.listeners.set(key, set);
    return () => set.delete(listener);
  }

  fetch<T>(key: string, fetcher: () => Promise<T>): Promise<void> {
    const running = this.inflight.get(key);
    if (running) return running;
    const startedAt = this.generation.get(key) ?? 0;
    const promise = fetcher()
      .then((data) => this.set(key, { status: 'success', data, error: undefined, stale: false }))
      .catch((error: unknown) =>
        this.set(key, { status: 'error', data: this.snapshot<T>(key).data, error, stale: false }),
      )
      .finally(() => {
        this.inflight.delete(key);
        // Invalidated while in flight: the result predates the mutation, so fetch again.
        if ((this.generation.get(key) ?? 0) !== startedAt) void this.fetch(key, fetcher);
      });
    this.inflight.set(key, promise);
    return promise;
  }

  /** Mark every query whose key starts with `prefix` as stale; mounted queries refetch. */
  invalidate(prefix: string): void {
    // Include keys still loading for the first time, so their in-flight result is refetched.
    const keys = new Set([...this.entries.keys(), ...this.inflight.keys()]);
    for (const key of keys) {
      if (!key.startsWith(`["${prefix}"`)) continue;
      this.generation.set(key, (this.generation.get(key) ?? 0) + 1);
      const entry = this.entries.get(key);
      if (entry && !this.inflight.has(key))
        this.set(key, { ...entry, stale: true } as QueryState<unknown>);
    }
  }

  clear(): void {
    this.entries.clear();
    for (const key of this.listeners.keys()) this.notify(key);
  }

  private set(key: string, state: QueryState<unknown>): void {
    this.entries.set(key, state);
    this.notify(key);
  }

  private notify(key: string): void {
    this.listeners.get(key)?.forEach((listener) => listener());
  }
}
