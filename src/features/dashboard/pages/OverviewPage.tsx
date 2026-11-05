import { sortAgents } from '@/features/agents';
import { Link } from 'react-router';
import { AgentFilter, useAgentParam } from '@/features/agents';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { LinkButton } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import { AgentBreakdown } from '../components/AgentBreakdown';
import { CriteriaPerformance } from '../components/CriteriaPerformance';
import { KpiRow } from '../components/KpiRow';
import { SampleNotice, VersionNotice } from '../components/SampleNotice';
import { usePerformance } from '../hooks/usePerformance';
import { VersionFilter } from '../components/VersionFilter';
import styles from './Pages.module.css';
import layout from '../components/Dashboard.module.css';

/** Overall performance across all agents (or the agent selected in the filter). */
export function OverviewPage() {
  const { t } = useI18n();
  useDocumentTitle(t('dashboard.overview.title'), t('app.title'));
  const [agentId] = useAgentParam();
  const { query, derived, version, setVersion } = usePerformance(agentId);
  const agent = derived?.agents.find((a) => a.id === agentId);

  return (
    <>
      <PageHeader
        eyebrow={t('nav.performance')}
        title={t('dashboard.overview.title')}
        description={
          agent ? (
            <span className={styles.scope}>
              {t('dashboard.overview.scopeAgent', { name: agent.displayName })}{' '}
              <Link to={`/agents/${encodeURIComponent(agent.id)}`}>
                {t('dashboard.overview.openAgent')}
              </Link>
            </span>
          ) : (
            t('dashboard.overview.scopeAll')
          )
        }
        actions={
          <>
            <AgentFilter />
            {derived && derived.availableVersions.length > 1 && (
              <VersionFilter
                versions={derived.availableVersions}
                value={version}
                onChange={setVersion}
              />
            )}
            <LinkButton
              to={agentId ? `/calls?agent=${encodeURIComponent(agentId)}` : '/calls'}
              icon="phone"
            >
              {t('dashboard.overview.viewCalls')}
            </LinkButton>
          </>
        }
      />
      <QueryView query={query} rows={6}>
        {() =>
          derived && (
            <div className={styles.stack}>
              <SampleNotice evaluatedCalls={derived.summary.outcomes.scored} />
              <KpiRow summary={derived.summary} />
              {derived.summary.scope === 'all_versions' && (
                <VersionNotice versions={derived.availableVersions} />
              )}
              {!agentId && <AgentBreakdown agents={sortAgents(derived.agents)} />}
              <div className={layout.split}>
                <CriteriaPerformance summary={derived.summary} />
              </div>
            </div>
          )
        }
      </QueryView>
    </>
  );
}
