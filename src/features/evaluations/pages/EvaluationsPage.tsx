import { useState } from 'react';
import { AgentFilter, useAgentParam, useAgents } from '@/features/agents';
import { combineQueries } from '@/shared/hooks/combineQueries';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Card } from '@/shared/ui/Card';
import { Checkbox } from '@/shared/ui/Field';
import { PageHeader } from '@/shared/ui/PageHeader';
import { EmptyState, QueryView } from '@/shared/ui/States';
import { EvaluationLog } from '../components/EvaluationLog';
import { useEvaluations } from '../hooks/useEvaluationData';

export function EvaluationsPage() {
  const { t, fmt } = useI18n();
  useDocumentTitle(t('evaluations.page.title'), t('app.title'));
  const [agentId] = useAgentParam();
  const [rescoresOnly, setRescoresOnly] = useState(false);
  const query = combineQueries([
    useEvaluations({ agentId: agentId ?? undefined }),
    useAgents({ includeRetired: true }),
  ] as const);

  return (
    <>
      <PageHeader
        eyebrow={t('nav.performance')}
        title={t('evaluations.page.title')}
        description={t('evaluations.page.description')}
        actions={<AgentFilter />}
      />
      <QueryView query={query}>
        {([evaluations, agents]) => {
          const shown = rescoresOnly
            ? evaluations.filter((e) => e.trigger === 'rescore')
            : evaluations;
          return (
            <Card
              title={t('evaluations.page.logTitle')}
              caption={t('evaluations.page.logCaption', { n: fmt.integer(shown.length) })}
              actions={
                <Checkbox checked={rescoresOnly} onChange={setRescoresOnly}>
                  {t('evaluations.page.rescoresOnly')}
                </Checkbox>
              }
              flush
            >
              {shown.length === 0 ? (
                <EmptyState title={t('evaluations.none')} />
              ) : (
                <EvaluationLog
                  evaluations={shown}
                  agents={agents}
                  label={t('evaluations.page.logTitle')}
                />
              )}
            </Card>
          );
        }}
      </QueryView>
    </>
  );
}
