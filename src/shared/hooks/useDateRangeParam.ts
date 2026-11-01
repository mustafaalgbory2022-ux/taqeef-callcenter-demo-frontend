import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { DateRange } from '@/shared/types/domain';
import { isValidRange, presetRange, todayISO } from '@/shared/utils/dates';

/**
 * Date range in the URL (?from=YYYY-MM-DD&to=YYYY-MM-DD) so filtered views are shareable.
 * Defaults to the last 30 days.
 */
export function useDateRangeParam(): [DateRange, (range: DateRange) => void] {
  const [params, setParams] = useSearchParams();
  const from = params.get('from');
  const to = params.get('to');
  const range = useMemo(() => {
    const candidate = { from: from ?? '', to: to ?? '' };
    return isValidRange(candidate) ? candidate : presetRange('last30', todayISO());
  }, [from, to]);
  const set = useCallback(
    (next: DateRange) =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('from', next.from);
          p.set('to', next.to);
          p.delete('page');
          return p;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [range, set];
}
