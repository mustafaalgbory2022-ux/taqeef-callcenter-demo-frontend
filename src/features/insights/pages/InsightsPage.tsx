import { Link } from 'react-router';
import { AgentFilter, QueueFilter, useAgentParam, useQueueParam } from '@/features/agents';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useDateRangeParam } from '@/shared/hooks/useDateRangeParam';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Card } from '@/shared/ui/Card';
import { BarList } from '@/shared/ui/charts/BarList';
import { LineChart } from '@/shared/ui/charts/LineChart';
import { DateRangeFilter } from '@/shared/ui/DateRangeFilter';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { EmptyState, QueryView } from '@/shared/ui/States';
import { StatTile } from '@/shared/ui/StatTile';
import { TableRegion } from '@/shared/ui/Table';
import { weekKey } from '@/shared/utils/dates';
import { summarizeInsights } from '../model/insights';
import styles from './Insights.module.css';

/** Customer insights from AI call classification (reasons, complaints, service requests). */
export function InsightsPage() {
  const { t, fmt } = useI18n();
  useDocumentTitle(t('insights.title'), t('app.title'));
  const [range, setRange] = useDateRangeParam();
  const [queueId] = useQueueParam();
  const [agentId] = useAgentParam();
  const rows = useApiQuery(['insights', range.from, range.to, queueId, agentId], (api) =>
    api.listInsights(range, { queueId: queueId ?? undefined, agentId: agentId ?? undefined }),
  );
  const pct = (n: number, d: number) => (d ? `${fmt.integer(Math.round((n / d) * 100))}%` : '—');
  const callsLink = (reason: string) =>
    `/calls?from=${range.from}&to=${range.to}&reason=${reason}${queueId ? `&queue=${queueId}` : ''}`;

  return (
    <>
      <PageHeader
        eyebrow={t('nav.operations')}
        title={t('insights.title')}
        description={t('insights.description')}
      />
      <div className={styles.filters}>
        <DateRangeFilter value={range} onChange={setRange} />
        <QueueFilter />
        <AgentFilter />
      </div>
      <Notice tone="mock">{t('insights.simulatedNote')}</Notice>
      <QueryView query={rows}>
        {(data) => {
          const s = summarizeInsights(data, weekKey);
          if (s.total === 0) return <EmptyState title={t('insights.empty')} />;
          return (
            <>
              <section className={styles.kpis} aria-label={t('insights.title')}>
                <StatTile
                  testId="insights-total"
                  label={t('insights.classified')}
                  value={fmt.integer(s.total)}
                />
                <StatTile
                  label={t('insights.complaints')}
                  value={fmt.integer(s.complaints)}
                  footnote={pct(s.complaints, s.total)}
                />
                <StatTile
                  label={t('insights.serviceRequests')}
                  value={fmt.integer(s.serviceRequests)}
                  footnote={pct(s.serviceRequests, s.total)}
                />
                <StatTile
                  label={t('insights.topReason')}
                  value={s.byReason[0] ? t(`insights.reasons.${s.byReason[0].reason}`) : '—'}
                  footnote={s.byReason[0] ? pct(s.byReason[0].calls, s.total) : undefined}
                />
              </section>
              <div className={styles.split}>
                <Card title={t('insights.byReason')} caption={t('insights.byReasonCaption')}>
                  <BarList
                    label={t('insights.byReason')}
                    items={s.byReason.map((r) => ({
                      key: r.reason,
                      label: t(`insights.reasons.${r.reason}`),
                      value: r.calls,
                      display: `${fmt.integer(r.calls)} (${pct(r.calls, s.total)})`,
                    }))}
                  />
                </Card>
                <Card title={t('insights.complaintTrend')}>
                  <LineChart
                    title={t('insights.complaintTrend')}
                    points={s.complaintTrend.map((p) => ({
                      label: fmt.date(p.period),
                      value: p.complaints,
                    }))}
                    formatValue={(v) => fmt.integer(v)}
                  />
                </Card>
              </div>
              <Card title={t('insights.table')} flush>
                <TableRegion label={t('insights.table')}>
                  <thead>
                    <tr>
                      <th scope="col">{t('insights.reason')}</th>
                      <th scope="col">{t('insights.calls')}</th>
                      <th scope="col">{t('insights.complaints')}</th>
                      <th scope="col">{t('insights.serviceRequests')}</th>
                      <th scope="col">
                        <span className="visually-hidden">{t('common.actions')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.byReason.map((r) => (
                      <tr key={r.reason}>
                        <th scope="row">{t(`insights.reasons.${r.reason}`)}</th>
                        <td>{fmt.integer(r.calls)}</td>
                        <td>{fmt.integer(r.complaints)}</td>
                        <td>{fmt.integer(r.serviceRequests)}</td>
                        <td>
                          <Link to={callsLink(r.reason)}>
                            {t('insights.viewCalls')}
                            <span className="visually-hidden">
                              {' '}
                              — {t(`insights.reasons.${r.reason}`)}
                            </span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableRegion>
              </Card>
            </>
          );
        }}
      </QueryView>
    </>
  );
}
