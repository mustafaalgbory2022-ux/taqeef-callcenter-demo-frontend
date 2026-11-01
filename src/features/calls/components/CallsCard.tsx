import { useMemo, type ReactNode } from 'react';
import { useAgents, useQueues } from '@/features/agents';
import { currentEvaluations, useEvaluations } from '@/features/evaluations';
import { useScorecardVersions } from '@/features/scorecards';
import { combineQueries } from '@/shared/hooks/combineQueries';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { CallQuery } from '@/shared/types/domain';
import { Card } from '@/shared/ui/Card';
import { Pagination } from '@/shared/ui/Pagination';
import { EmptyState, QueryView } from '@/shared/ui/States';
import { useCalls } from '../hooks/useCallData';
import { CallsTable } from './CallsTable';

/** Paginated calls list with current scores. Reused by the calls page and agent dashboards. */
export function CallsCard({
  query,
  onPage,
  actions,
}: {
  query: CallQuery;
  onPage: (page: number) => void;
  actions?: ReactNode;
}) {
  const { t, fmt } = useI18n();
  const result = combineQueries([
    useCalls(query),
    useAgents(),
    useQueues(),
    useEvaluations({
      agentId: query.agentId,
      from: query.from,
      to: query.to,
      queueId: query.queueId,
    }),
    useScorecardVersions(),
  ] as const);
  const current = useMemo(
    () =>
      result.status === 'success'
        ? new Map(currentEvaluations(result.data[3]).map((e) => [e.callId, e]))
        : new Map(),
    [result.status, result.data],
  );

  return (
    <QueryView query={result}>
      {([page, agents, queues, , versions]) => (
        <Card
          title={t('calls.list.title')}
          caption={t('calls.list.caption', { n: fmt.integer(page.total) })}
          actions={actions}
          flush
        >
          {page.total === 0 ? (
            <EmptyState title={t('calls.list.empty')} />
          ) : (
            <>
              <CallsTable
                calls={page.items}
                agents={agents}
                queues={queues}
                current={current}
                versions={versions}
                label={t('calls.list.title')}
              />
              <Pagination
                page={page.page}
                pageSize={page.pageSize}
                total={page.total}
                onPage={onPage}
              />
            </>
          )}
        </Card>
      )}
    </QueryView>
  );
}
