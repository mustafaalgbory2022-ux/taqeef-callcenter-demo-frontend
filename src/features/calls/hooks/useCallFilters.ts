import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { CALL_REASONS } from '@/shared/api/wire/calls';
import { useDateRangeParam } from '@/shared/hooks/useDateRangeParam';
import type { CallQuery, CallReason, ReviewStatus, ScoreBand } from '@/shared/types/domain';

const BANDS: readonly ScoreBand[] = ['low', 'meets', 'no_score', 'unscored'];
const REVIEWS: readonly ReviewStatus[] = ['unreviewed', 'reviewed', 'needs_follow_up'];

const oneOf = <T extends string>(values: readonly T[], v: string | null): T | undefined =>
  v !== null && (values as readonly string[]).includes(v) ? (v as T) : undefined;

/** All calls-list filters live in the URL so filtered lists are shareable and survive reloads. */
export function useCallFilters(): [
  CallQuery,
  (patch: Partial<Record<keyof CallQuery, string | number | null>>) => void,
] {
  const [params, setParams] = useSearchParams();
  const [range] = useDateRangeParam();
  const query = useMemo<CallQuery>(
    () => ({
      from: range.from,
      to: range.to,
      queueId: params.get('queue') ?? undefined,
      agentId: params.get('agent') ?? undefined,
      reason: oneOf<CallReason>(CALL_REASONS, params.get('reason')),
      scoreBand: oneOf(BANDS, params.get('band')),
      reviewStatus: oneOf(REVIEWS, params.get('review')),
      search: params.get('q') ?? undefined,
      page: Math.max(1, Number(params.get('page')) || 1),
      pageSize: 25,
    }),
    [params, range],
  );
  const update = useCallback(
    (patch: Partial<Record<keyof CallQuery, string | number | null>>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const keys: Partial<Record<keyof CallQuery, string>> = {
            reason: 'reason',
            scoreBand: 'band',
            reviewStatus: 'review',
            search: 'q',
            page: 'page',
          };
          for (const [k, v] of Object.entries(patch)) {
            const name = keys[k as keyof CallQuery];
            if (!name) continue;
            if (v === null || v === '' || v === undefined) next.delete(name);
            else next.set(name, String(v));
          }
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [query, update];
}
export { BANDS as SCORE_BANDS, REVIEWS as REVIEW_STATUSES };
