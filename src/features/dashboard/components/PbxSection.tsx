import { useQueues } from '@/features/agents';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { PbxMetrics } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { LineChart } from '@/shared/ui/charts/LineChart';
import { Notice } from '@/shared/ui/Notice';
import { StatTile } from '@/shared/ui/StatTile';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { dailySeries, groupBy, summarizeQueue } from '@/shared/utils/pbx';
import { formatDuration } from '@/shared/utils/time';
import styles from './Dashboard.module.css';

/** PBX call-handling figures. Missed and abandoned are always separate; SLA uses the approved formula. */
export function PbxSection({ pbx }: { pbx: PbxMetrics }) {
  const { t, fmt, pick } = useI18n();
  const queues = useQueues();
  const s = summarizeQueue(pbx.queueDaily);
  const pct = (v: number | null) => (v === null ? '—' : `${fmt.score(v)}%`);
  const secs = (v: number | null) => (v === null ? '—' : formatDuration(v * 1000));
  const series = dailySeries(pbx.queueDaily);
  const byQueue = groupBy(pbx.queueDaily, (r) => r.queueId);

  if (pbx.queueDaily.length === 0) {
    return (
      <Notice tone="info" title={t('dashboard.pbx.unavailable')}>
        {t('dashboard.pbx.unavailableBody')}
      </Notice>
    );
  }
  return (
    <>
      <section className={styles.kpis} aria-label={t('dashboard.pbx.title')} data-testid="pbx-kpis">
        <StatTile
          label={t('dashboard.pbx.incoming')}
          value={fmt.integer(s.incoming)}
          footnote={pbx.simulated ? t('dashboard.pbx.simulatedShort') : undefined}
        />
        <StatTile label={t('dashboard.pbx.answered')} value={fmt.integer(s.answered)} />
        <StatTile
          label={t('dashboard.pbx.missed')}
          value={fmt.integer(s.missed)}
          footnote={t('dashboard.pbx.missedNote')}
        />
        <StatTile
          label={t('dashboard.pbx.abandoned')}
          value={fmt.integer(s.abandoned)}
          footnote={t('dashboard.pbx.abandonedNote')}
        />
        <StatTile
          testId="kpi-sla"
          label={t('dashboard.pbx.sla')}
          value={pct(s.slaPercent)}
          footnote={t('dashboard.pbx.slaShort')}
        />
        <StatTile
          label={t('dashboard.pbx.avgWait')}
          value={secs(s.avgWaitS)}
          footnote={t('dashboard.pbx.maxWait', { v: secs(s.maxWaitS) })}
        />
      </section>
      <div className={styles.split}>
        <Card
          title={t('dashboard.trends.incoming')}
          caption={pbx.simulated ? <Badge tone="mock">{t('common.simulated')}</Badge> : undefined}
        >
          <LineChart
            title={t('dashboard.trends.incoming')}
            points={series.map((p) => ({ label: fmt.date(p.date), value: p.incoming }))}
            formatValue={(v) => fmt.integer(v)}
          />
        </Card>
        <Card title={t('dashboard.trends.sla')} caption={t('dashboard.pbx.formula')}>
          <LineChart
            title={t('dashboard.trends.sla')}
            points={series.map((p) => ({ label: fmt.date(p.date), value: p.slaPercent }))}
            formatValue={(v) => `${fmt.integer(v)}%`}
            min={0}
            max={100}
          />
        </Card>
      </div>
      <Card title={t('dashboard.queues.title')} caption={t('dashboard.queues.caption')} flush>
        <TableRegion label={t('dashboard.queues.title')}>
          <thead>
            <tr>
              <th scope="col">{t('queues.filter.label')}</th>
              <th scope="col">{t('dashboard.pbx.incoming')}</th>
              <th scope="col">{t('dashboard.pbx.answered')}</th>
              <th scope="col">{t('dashboard.pbx.missed')}</th>
              <th scope="col">{t('dashboard.pbx.abandoned')}</th>
              <th scope="col">{t('dashboard.pbx.sla')}</th>
              <th scope="col">{t('dashboard.pbx.avgWait')}</th>
            </tr>
          </thead>
          <tbody>
            {[...byQueue.entries()].map(([queueId, rows]) => {
              const q = summarizeQueue(rows);
              const queue = queues.data?.find((x) => x.id === queueId);
              return (
                <tr key={queueId}>
                  <th scope="row">
                    <bdi>{queue ? `${queue.number} · ${pick(queue.name)}` : queueId}</bdi>
                  </th>
                  <td>{fmt.integer(q.incoming)}</td>
                  <td>{fmt.integer(q.answered)}</td>
                  <td>{fmt.integer(q.missed)}</td>
                  <td>{fmt.integer(q.abandoned)}</td>
                  <td className={tableStyles.mono}>
                    <bdi>{pct(q.slaPercent)}</bdi>
                  </td>
                  <td>
                    <bdi>{secs(q.avgWaitS)}</bdi>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableRegion>
      </Card>
    </>
  );
}
