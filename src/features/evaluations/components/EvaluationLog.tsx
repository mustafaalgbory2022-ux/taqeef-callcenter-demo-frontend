import { Link } from 'react-router';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Agent, Evaluation } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { historyByCall } from '../model/current';
import { Delta, OverallValue } from './ResultValue';

/** Evaluation and re-scoring log with change versus the previous evaluation of the same call. */
export function EvaluationLog({
  evaluations,
  agents,
  label,
}: {
  evaluations: readonly Evaluation[];
  agents: readonly Agent[];
  label: string;
}) {
  const { t, fmt } = useI18n();
  const histories = historyByCall(evaluations);
  const previousOf = (e: Evaluation) => {
    const list = histories.get(e.callId) ?? [];
    return list[list.findIndex((x) => x.id === e.id) + 1] ?? null;
  };
  const rows = [...evaluations].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const agentName = (id: string | null) => agents.find((a) => a.id === id)?.displayName ?? '—';

  return (
    <TableRegion label={label}>
      <thead>
        <tr>
          <th scope="col">{t('evaluations.log.date')}</th>
          <th scope="col">{t('evaluations.log.call')}</th>
          <th scope="col">{t('agents.fields.name')}</th>
          <th scope="col">{t('evaluations.log.type')}</th>
          <th scope="col">{t('evaluations.log.version')}</th>
          <th scope="col">{t('evaluations.overall')}</th>
          <th scope="col">{t('evaluations.log.change')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((e) => {
          const prev = previousOf(e);
          return (
            <tr key={e.id}>
              <td className={tableStyles.muted}>
                <bdi>{fmt.dateTime(e.createdAt)}</bdi>
              </td>
              <td className={tableStyles.mono}>
                <Link to={`/calls/${encodeURIComponent(e.callId)}`}>
                  <bdi>{e.callId}</bdi>
                </Link>
              </td>
              <td>{agentName(e.agentId)}</td>
              <td>
                <Badge tone={e.trigger === 'rescore' ? 'accent' : 'neutral'}>
                  {t(`evaluations.trigger.${e.trigger}`)}
                </Badge>
              </td>
              <td>
                <bdi>v{e.scorecardVersion}</bdi>
              </td>
              <td>
                <OverallValue evaluation={e} />
              </td>
              <td>
                {prev ? (
                  <Delta from={prev.overallScore} to={e.overallScore} />
                ) : (
                  <span className={tableStyles.muted}>—</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </TableRegion>
  );
}
