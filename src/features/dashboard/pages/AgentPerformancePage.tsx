import { useParams } from 'react-router';
import { CallsCard } from '@/features/calls';
import { EvaluationLog, useEvaluations } from '@/features/evaluations';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Badge, SyntheticBadge } from '@/shared/ui/Badge';
import { LinkButton } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui/PageHeader';
import { EmptyState, QueryView } from '@/shared/ui/States';
import type { Agent } from '@/shared/types/domain';
import { CriteriaPerformance } from '../components/CriteriaPerformance';
import { KpiRow } from '../components/KpiRow';
import { SampleNotice, VersionNotice } from '../components/SampleNotice';
import { usePerformance } from '../hooks/usePerformance';
import { VersionFilter } from '../components/VersionFilter';
import layout from '../components/Dashboard.module.css';
import styles from './Pages.module.css';

/** Individual agent dashboard with click-through to calls, evidence and history. */
export function AgentPerformancePage() {
  const { agentId = '' } = useParams();
  const { t } = useI18n();
  const { query, derived, version, setVersion } = usePerformance(agentId);
  const agent = derived?.agents.find((a) => a.id === agentId);
  useDocumentTitle(agent?.displayName ?? t('dashboard.agent.title'), t('app.title'));

  return (
    <QueryView query={query} rows={6}>
      {() =>
        !derived || !agent ? (
          <EmptyState title={t('dashboard.agent.notFound')} />
        ) : (
          <AgentDashboard
            agent={agent}
            derived={derived}
            version={version}
            setVersion={setVersion}
          />
        )
      }
    </QueryView>
  );
}

function AgentDashboard({
  agent,
  derived,
  version,
  setVersion,
}: {
  agent: Agent;
  derived: NonNullable<ReturnType<typeof usePerformance>['derived']>;
  version: number | null;
  setVersion: (version: number | null) => void;
}) {
  const { t } = useI18n();
  const evaluations = useEvaluations({ agentId: agent.id });
  const q = encodeURIComponent(agent.id);

  return (
    <div className={styles.stack}>
      <PageHeader
        eyebrow={t('dashboard.agent.title')}
        title={agent.displayName}
        description={
          <dl className={styles.profileList}>
            <div>
              <dt>{t('agents.fields.extension')}</dt>
              <dd>
                <bdi>{agent.extension}</bdi>
              </dd>
            </div>
            <div>
              <dt>{t('agents.fields.status')}</dt>
              <dd>
                <Badge tone={agent.status === 'active' ? 'success' : 'neutral'}>
                  {t(`agents.status.${agent.status}`)}
                </Badge>
              </dd>
            </div>
            {agent.synthetic && (
              <div>
                <dt>{t('common.dataLabel')}</dt>
                <dd>
                  <SyntheticBadge />
                </dd>
              </div>
            )}
          </dl>
        }
        actions={
          <>
            {derived.availableVersions.length > 1 && (
              <VersionFilter
                versions={derived.availableVersions}
                value={version}
                onChange={setVersion}
              />
            )}
            <LinkButton to={`/?agent=${q}`} icon="dashboard">
              {t('dashboard.agent.inOverview')}
            </LinkButton>
            <LinkButton to={`/evaluations?agent=${q}`} icon="history">
              {t('dashboard.agent.history')}
            </LinkButton>
          </>
        }
      />
      <SampleNotice evaluatedCalls={derived.summary.scoredCalls} />
      <KpiRow summary={derived.summary} />
      <VersionNotice versions={derived.summary.scorecardVersions} />
      <div className={layout.split}>
        <CriteriaPerformance summary={derived.summary} />
      </div>
      <CallsCard
        agentId={agent.id}
        actions={
          <LinkButton size="sm" to={`/calls?agent=${q}`}>
            {t('dashboard.agent.allCalls')}
          </LinkButton>
        }
      />
      <Card
        title={t('dashboard.agent.rescoreTitle')}
        caption={t('dashboard.agent.rescoreCaption')}
        flush
      >
        <QueryView query={evaluations}>
          {(list) =>
            list.length === 0 ? (
              <EmptyState title={t('evaluations.none')} />
            ) : (
              <EvaluationLog
                evaluations={list}
                agents={derived.agents}
                label={t('dashboard.agent.rescoreTitle')}
              />
            )
          }
        </QueryView>
      </Card>
    </div>
  );
}
