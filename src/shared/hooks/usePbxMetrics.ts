import type { DateRange } from '@/shared/types/domain';
import { useApiQuery } from './useApiQuery';

/** PBX statistics for a date range (and optional queue). Real source: Yeastar via backend. */
export const usePbxMetrics = (range: DateRange, queueId: string | null) =>
  useApiQuery(['pbx', range.from, range.to, queueId], (api) =>
    api.getPbxMetrics(range, queueId ?? undefined),
  );
