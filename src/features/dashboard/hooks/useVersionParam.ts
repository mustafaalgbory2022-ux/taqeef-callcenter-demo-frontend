import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/** Scorecard-version filter in the URL (?version=2). `null` = all versions. */
export function useVersionParam(): [number | null, (version: number | null) => void] {
  const [params, setParams] = useSearchParams();
  const raw = Number(params.get('version'));
  const value = Number.isInteger(raw) && raw > 0 ? raw : null;
  const set = useCallback(
    (version: number | null) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (version === null) next.delete('version');
          else next.set('version', String(version));
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [value, set];
}
