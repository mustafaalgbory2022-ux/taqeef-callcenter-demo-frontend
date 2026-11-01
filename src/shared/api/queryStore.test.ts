import { describe, expect, it } from 'vitest';
import { QueryStore } from './queryStore';

describe('QueryStore', () => {
  it('refetches when invalidated while a fetch is in flight', async () => {
    const store = new QueryStore();
    let value = 'old';
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      const snapshot = value;
      await new Promise((r) => setTimeout(r, 5));
      return snapshot;
    };
    void store.fetch('["k"]', fetcher);
    value = 'new';
    store.invalidate('k');
    await new Promise((r) => setTimeout(r, 40));
    expect(calls).toBe(2);
    expect(store.snapshot('["k"]')).toMatchObject({ status: 'success', data: 'new' });
  });
});
