import { Link } from 'react-router';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Badge, SyntheticBadge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { ScoreFlag, ScoreValue } from '@/shared/ui/ScoreValue';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import type { AgentSummary } from '../model/aggregate';

/** Per-agent sample results, alphabetical. Deliberately not sortable by score. */
export function AgentBreakdown({
  rows,
  threshold,
}: {
  rows: readonly AgentSummary[];
  threshold: number;
}) {
  const { t, fmt } = useI18n();
  return (
    <Card title={t('dashboard.agents.title')} caption={t('dashboard.agents.caption')} flush>
      <TableRegion label={t('dashboard.agents.title')}>
        <thead>
          <tr>
            <th scope="col">{t('agents.fields.name')}</th>
            <th scope="col">{t('agents.fields.extension')}</th>
            <th scope="col">{t('dashboard.agents.evaluated')}</th>
            <th scope="col">{t('dashboard.agents.average')}</th>
            <th scope="col">{t('dashboard.agents.low')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ agent, summary }) => (
            <tr key={agent.id}>
              <td>
                <Link to={`/agents/${encodeURIComponent(agent.id)}`}>{agent.displayName}</Link>{' '}
                {agent.synthetic && <SyntheticBadge />}{' '}
                {agent.status === 'inactive' && <Badge>{t('agents.status.inactive')}</Badge>}
              </td>
              <td className={tableStyles.mono}>
                <bdi>{agent.extension}</bdi>
              </td>
              <td>
                <bdi>{fmt.integer(summary.evaluatedCalls)}</bdi>
              </td>
              <td>
                {summary.averageScore === null ? (
                  <span className={tableStyles.muted}>{t('common.noScore')}</span>
                ) : (
                  <>
                    <ScoreValue score={summary.averageScore} />{' '}
                    <ScoreFlag score={summary.averageScore} threshold={threshold} />
                  </>
                )}
              </td>
              <td>
                <bdi>{fmt.integer(summary.lowScoreCalls)}</bdi>
              </td>
            </tr>
          ))}
        </tbody>
      </TableRegion>
    </Card>
  );
}
