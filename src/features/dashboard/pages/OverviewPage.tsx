import { Link } from 'react-router';
import { AgentFilter, QueueFilter, useAgentParam, useQueueParam } from '@/features/agents';
import { useDateRangeParam } from '@/shared/hooks/useDateRangeParam';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePbxMetrics } from '@/shared/hooks/usePbxMetrics';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { DateRangeFilter } from '@/shared/ui/DateRangeFilter';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import { AgentBreakdown } from '../components/AgentBreakdown';
import { CriteriaPerformance } from '../components/CriteriaPerformance';
import { KpiRow } from '../components/KpiRow';
import { PbxSection } from '../components/PbxSection';
import { QualityTrend } from '../components/QualityTrend';
import { SampleNotice, VersionNotice } from '../components/SampleNotice';
import { VersionFilter } from '../components/VersionFilter';
import { usePerformance } from '../hooks/usePerformance';
import layout from '../components/Dashboard.module.css';
import styles from './Pages.module.css';

/** Executive dashboard: PBX call handling + AI quality for a date range, queue and agent. */
export function OverviewPage() {
  const { t } = useI18n();
  useDocumentTitle(t('dashboard.overview.title'), t('app.title'));
  const [range, setRange] = useDateRangeParam();
  const [queueId] = useQueueParam();
  const [agentId] = useAgentParam();
  const { query, derived, version, setVersion } = usePerformance(agentId, range, queueId);
  const pbx = usePbxMetrics(range, queueId);
  const agent = derived?.agents.find((a) => a.id === agentId);

  return (
    <>
      <PageHeader
        eyebrow={t('nav.operations')}
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
      />
      <div className={styles.filters}>
        <DateRangeFilter value={range} onChange={setRange} />
        <QueueFilter />
        <AgentFilter />
        {derived && derived.availableVersions.length > 1 && (
          <VersionFilter
            versions={derived.availableVersions}
            value={version}
            onChange={setVersion}
          />
        )}
      </div>
      <h2 className={styles.sectionHeading}>{t('dashboard.sections.callHandling')}</h2>
      <QueryView query={pbx} rows={3}>
        {(data) =>
          agentId ? (
            <p className={styles.hint}>{t('dashboard.pbx.agentScopeNote')}</p>
          ) : (
            <PbxSection pbx={data} />
          )
        }
      </QueryView>
      <h2 className={styles.sectionHeading}>{t('dashboard.sections.quality')}</h2>
      <QueryView query={query} rows={6}>
        {() =>
          derived && (
            <div className={styles.stack}>
              <SampleNotice evaluatedCalls={derived.summary.scoredCalls} />
              <KpiRow summary={derived.summary} />
              <VersionNotice versions={derived.summary.scorecardVersions} />
              {!agentId && (
                <AgentBreakdown rows={derived.byAgent} threshold={derived.summary.threshold} />
              )}
              <div className={layout.split}>
                <CriteriaPerformance summary={derived.summary} />
                <QualityTrend weekly={derived.weekly} threshold={derived.summary.threshold} />
              </div>
            </div>
          )
        }
      </QueryView>
    </>
  );
}
