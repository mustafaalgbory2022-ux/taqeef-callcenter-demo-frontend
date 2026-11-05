import { useMemo, type ReactNode } from 'react';
import { useAgents } from '@/features/agents';
import { currentEvaluations, useEvaluations } from '@/features/evaluations';
import { useScorecardVersions } from '@/features/scorecards';
import { combineQueries } from '@/shared/hooks/combineQueries';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Card } from '@/shared/ui/Card';
import { EmptyState, QueryView } from '@/shared/ui/States';
import { useCalls } from '../hooks/useCallData';
import { CallsTable } from './CallsTable';

/** Calls list with current scores, optionally for one agent. Reused by dashboards. */
export function CallsCard({ agentId, actions }: { agentId: string | null; actions?: ReactNode }) {
  const { t, fmt } = useI18n();
  const query = combineQueries([
    useCalls(agentId),
    useAgents({ includeRetired: true }),
    useEvaluations({ agentId: agentId ?? undefined }),
    useScorecardVersions(),
  ] as const);
  const current = useMemo(
    () =>
      query.status === 'success'
        ? new Map(currentEvaluations(query.data[2]).map((e) => [e.callId, e]))
        : new Map(),
    [query.status, query.data],
  );

  return (
    <QueryView query={query}>
      {([calls, agents, , versions]) => (
        <Card
          title={t('calls.list.title')}
          caption={t('calls.list.caption', { n: fmt.integer(calls.length) })}
          actions={actions}
          flush
        >
          {calls.length === 0 ? (
            <EmptyState title={t('calls.list.empty')} />
          ) : (
            <CallsTable
              calls={calls}
              agents={agents}
              current={current}
              versions={versions}
              label={t('calls.list.title')}
            />
          )}
        </Card>
      )}
    </QueryView>
  );
}
