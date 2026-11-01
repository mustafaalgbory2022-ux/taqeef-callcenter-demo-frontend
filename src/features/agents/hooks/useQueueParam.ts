import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/** Queue filter in the URL (?queue=<id>); null = all queues. */
export function useQueueParam(): [string | null, (queueId: string | null) => void] {
  const [params, setParams] = useSearchParams();
  const set = useCallback(
    (queueId: string | null) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (queueId) next.set('queue', queueId);
          else next.delete('queue');
          next.delete('page');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [params.get('queue'), set];
}
