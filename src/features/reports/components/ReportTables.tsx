import { Link } from 'react-router';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Card } from '@/shared/ui/Card';
import { ScoreValue } from '@/shared/ui/ScoreValue';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { formatDuration } from '@/shared/utils/time';
import type { AgentReportRow, QueueReportRow } from '../model/report';

export function QueueReportTable({ rows }: { rows: readonly QueueReportRow[] }) {
  const { t, fmt, pick } = useI18n();
  const pct = (v: number | null) => (v === null ? '—' : `${fmt.score(v)}%`);
  return (
    <Card title={t('reports.queueReport')} caption={t('dashboard.pbx.formula')} flush>
      <TableRegion label={t('reports.queueReport')}>
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
          {rows.map((r) => (
            <tr key={r.queue.id}>
              <th scope="row">
                <bdi>
                  {r.queue.number} · {pick(r.queue.name)}
                </bdi>
              </th>
              <td>{fmt.integer(r.incoming)}</td>
              <td>{fmt.integer(r.answered)}</td>
              <td>{fmt.integer(r.missed)}</td>
              <td>{fmt.integer(r.abandoned)}</td>
              <td className={tableStyles.mono}>
                <bdi>{pct(r.slaPercent)}</bdi>
              </td>
              <td>
                <bdi>{r.avgWaitS === null ? '—' : formatDuration(r.avgWaitS * 1000)}</bdi>
              </td>
            </tr>
          ))}
        </tbody>
      </TableRegion>
    </Card>
  );
}

export function AgentReportTable({ rows }: { rows: readonly AgentReportRow[] }) {
  const { t, fmt } = useI18n();
  return (
    <Card title={t('reports.agentReport')} caption={t('dashboard.agents.caption')} flush>
      <TableRegion label={t('reports.agentReport')}>
        <thead>
          <tr>
            <th scope="col">{t('agents.fields.name')}</th>
            <th scope="col">{t('dashboard.agents.evaluated')}</th>
            <th scope="col">{t('evaluations.noScore')}</th>
            <th scope="col">{t('dashboard.agents.average')}</th>
            <th scope="col">{t('dashboard.agents.low')}</th>
            <th scope="col">{t('dashboard.pbx.answered')}</th>
            <th scope="col">{t('dashboard.pbx.agentMissed')}</th>
            <th scope="col">{t('dashboard.pbx.avgTalk')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.agent.id}>
              <th scope="row">
                <Link to={`/agents/${encodeURIComponent(r.agent.id)}`}>{r.agent.displayName}</Link>
              </th>
              <td>{fmt.integer(r.scoredCalls)}</td>
              <td>{fmt.integer(r.insufficientCalls)}</td>
              <td>{r.averageScore === null ? '—' : <ScoreValue score={r.averageScore} />}</td>
              <td>{fmt.integer(r.lowScoreCalls)}</td>
              <td>{fmt.integer(r.answered)}</td>
              <td>{fmt.integer(r.missed)}</td>
              <td>
                <bdi>{r.avgTalkS === null ? '—' : formatDuration(r.avgTalkS * 1000)}</bdi>
              </td>
            </tr>
          ))}
        </tbody>
      </TableRegion>
    </Card>
  );
}
