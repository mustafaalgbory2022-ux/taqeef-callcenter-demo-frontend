import { useState } from 'react';
import { Link } from 'react-router';
import { QueueFilter, useQueueParam } from '@/features/agents';
import { useDateRangeParam } from '@/shared/hooks/useDateRangeParam';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePbxMetrics } from '@/shared/hooks/usePbxMetrics';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Badge, SyntheticBadge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { Sparkline } from '@/shared/ui/charts/LineChart';
import { DateRangeFilter } from '@/shared/ui/DateRangeFilter';
import { Checkbox } from '@/shared/ui/Field';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ScoreFlag, ScoreValue } from '@/shared/ui/ScoreValue';
import { QueryView } from '@/shared/ui/States';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { weekKey } from '@/shared/utils/dates';
import { summarizeAgent } from '@/shared/utils/pbx';
import { formatDuration } from '@/shared/utils/time';
import { SampleNotice } from '../components/SampleNotice';
import { usePerformance } from '../hooks/usePerformance';
import { weeklyQuality } from '../model/aggregate';
import styles from './Pages.module.css';

/** Side-by-side agent comparison (alphabetical; sample sizes always shown; no ranking). */
export function AgentsComparePage() {
  const { t, fmt } = useI18n();
  useDocumentTitle(t('agentsCompare.title'), t('app.title'));
  const [range, setRange] = useDateRangeParam();
  const [queueId] = useQueueParam();
  const { query, derived } = usePerformance(null, range, queueId);
  const pbx = usePbxMetrics(range, queueId);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

  return (
    <>
      <PageHeader
        eyebrow={t('nav.operations')}
        title={t('agentsCompare.title')}
        description={t('agentsCompare.description')}
      />
      <div className={styles.filters}>
        <DateRangeFilter value={range} onChange={setRange} />
        <QueueFilter />
      </div>
      <QueryView query={query} rows={6}>
        {() =>
          derived && (
            <div className={styles.stack}>
              <SampleNotice evaluatedCalls={derived.summary.scoredCalls} />
              <Card title={t('agentsCompare.select')}>
                <div className={styles.profileList}>
                  {derived.byAgent.map(({ agent }) => (
                    <Checkbox
                      key={agent.id}
                      checked={!hidden.has(agent.id)}
                      onChange={(on) =>
                        setHidden((prev) => {
                          const next = new Set(prev);
                          if (on) next.delete(agent.id);
                          else next.add(agent.id);
                          return next;
                        })
                      }
                    >
                      {agent.displayName}
                    </Checkbox>
                  ))}
                </div>
              </Card>
              <Card title={t('agentsCompare.table')} caption={t('dashboard.agents.caption')} flush>
                <TableRegion label={t('agentsCompare.table')}>
                  <thead>
                    <tr>
                      <th scope="col">{t('agents.fields.name')}</th>
                      <th scope="col">{t('dashboard.agents.evaluated')}</th>
                      <th scope="col">{t('dashboard.agents.average')}</th>
                      <th scope="col">{t('agentsCompare.trend')}</th>
                      <th scope="col">{t('dashboard.agents.low')}</th>
                      <th scope="col">{t('evaluations.noScore')}</th>
                      <th scope="col">{t('dashboard.pbx.answered')}</th>
                      <th scope="col">{t('dashboard.pbx.agentMissed')}</th>
                      <th scope="col">{t('dashboard.pbx.avgTalk')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {derived.byAgent
                      .filter(({ agent }) => !hidden.has(agent.id))
                      .map(({ agent, summary }) => {
                        const p = pbx.data
                          ? summarizeAgent(
                              pbx.data.agentDaily.filter((r) => r.agentId === agent.id),
                            )
                          : null;
                        const weekly = weeklyQuality(
                          derived.current.filter((e) => e.agentId === agent.id),
                          weekKey,
                        );
                        return (
                          <tr key={agent.id}>
                            <th scope="row">
                              <Link
                                to={`/agents/${encodeURIComponent(agent.id)}?from=${range.from}&to=${range.to}`}
                              >
                                {agent.displayName}
                              </Link>{' '}
                              {agent.synthetic && <SyntheticBadge />}{' '}
                              {agent.status === 'inactive' && (
                                <Badge>{t('agents.status.inactive')}</Badge>
                              )}
                            </th>
                            <td>
                              <bdi>n = {fmt.integer(summary.scoredCalls)}</bdi>
                            </td>
                            <td>
                              {summary.averageScore === null ? (
                                '—'
                              ) : (
                                <>
                                  <ScoreValue score={summary.averageScore} />{' '}
                                  <ScoreFlag
                                    score={summary.averageScore}
                                    threshold={summary.threshold}
                                  />
                                </>
                              )}
                            </td>
                            <td>
                              <Sparkline values={weekly.map((w) => w.averageScore)} />
                            </td>
                            <td>{fmt.integer(summary.lowScoreCalls)}</td>
                            <td>{fmt.integer(summary.insufficientCalls)}</td>
                            <td>{p ? fmt.integer(p.answered) : '—'}</td>
                            <td>{p ? fmt.integer(p.missed) : '—'}</td>
                            <td className={tableStyles.mono}>
                              <bdi>
                                {p?.avgTalkS != null ? formatDuration(p.avgTalkS * 1000) : '—'}
                              </bdi>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </TableRegion>
              </Card>
            </div>
          )
        }
      </QueryView>
    </>
  );
}
