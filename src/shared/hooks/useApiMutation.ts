import { useCallback, useState } from 'react';
import type { ApiClient } from '@/shared/api/client';
import { useApiContext } from '@/shared/api/ApiProvider';

export type MutationStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * Run a state-changing API call, then invalidate the listed query prefixes so every view
 * (including audit/history views) refreshes.
 */
export function useApiMutation<A, T>(
  action: (api: ApiClient, args: A) => Promise<T>,
  invalidates: readonly string[],
) {
  const { client, store } = useApiContext();
  const [status, setStatus] = useState<MutationStatus>('idle');
  const [error, setError] = useState<unknown>(undefined);

  const mutate = useCallback(
    async (args: A): Promise<T> => {
      setStatus('pending');
      setError(undefined);
      try {
        const result = await action(client, args);
        invalidates.forEach((prefix) => store.invalidate(prefix));
        setStatus('success');
        return result;
      } catch (err) {
        setError(err);
        setStatus('error');
        throw err;
      }
    },
    // `invalidates` is expected to be a constant list per call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action, client, store],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(undefined);
  }, []);

  return { mutate, status, error, reset, isPending: status === 'pending' };
}
