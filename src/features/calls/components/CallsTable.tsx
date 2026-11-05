import { Link } from 'react-router';
import { resultPresentation } from '@/features/evaluations';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Agent, Call, Evaluation, ScorecardVersion } from '@/shared/types/domain';
import { Badge, SyntheticBadge } from '@/shared/ui/Badge';
import { ScoreFlag, ScoreValue } from '@/shared/ui/ScoreValue';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { formatDuration } from '@/shared/utils/time';
import { CallStatusBadge } from './CallStatusBadge';

export interface CallsTableProps {
  calls: readonly Call[];
  agents: readonly Agent[];
  /** Current (latest eligible) evaluation per call id. */
  current: ReadonlyMap<string, Evaluation>;
  /** Kept for callers; low-score flags now come from each run (contract v0.1 3.7). */
  versions: readonly ScorecardVersion[];
  label: string;
}

export function CallsTable({ calls, agents, current, label }: CallsTableProps) {
  const { t, fmt } = useI18n();
  const agentOf = (id: string | null) => agents.find((a) => a.id === id);

  return (
    <TableRegion label={label}>
      <thead>
        <tr>
          <th scope="col">{t('calls.table.call')}</th>
          <th scope="col">{t('calls.table.topic')}</th>
          <th scope="col">{t('agents.fields.name')}</th>
          <th scope="col">{t('calls.table.recorded')}</th>
          <th scope="col">{t('calls.table.duration')}</th>
          <th scope="col">{t('calls.table.status')}</th>
          <th scope="col">{t('calls.table.score')}</th>
        </tr>
      </thead>
      <tbody>
        {calls.map((call) => {
          const evaluation = current.get(call.id);
          const agent = agentOf(call.agentId);
          return (
            <tr key={call.id}>
              <td className={tableStyles.mono}>
                <Link to={`/calls/${encodeURIComponent(call.id)}`}>
                  <bdi>{call.id}</bdi>
                </Link>
              </td>
              <td>
                {call.title} {call.synthetic && <SyntheticBadge />}
              </td>
              <td>
                {agent ? (
                  <Link to={`/agents/${encodeURIComponent(agent.id)}`}>{agent.displayName}</Link>
                ) : (
                  '—'
                )}
              </td>
              <td className={tableStyles.muted}>
                <bdi>{fmt.dateTime(call.recordedAt)}</bdi>
              </td>
              <td>
                <bdi>{call.durationMs === null ? '—' : formatDuration(call.durationMs)}</bdi>
              </td>
              <td>
                <CallStatusBadge status={call.status} />
              </td>
              <td>
                {evaluation?.displayHundredths != null ? (
                  <>
                    <ScoreValue hundredths={evaluation.displayHundredths} />{' '}
                    <ScoreFlag belowThreshold={evaluation.belowThreshold === true} />
                  </>
                ) : evaluation && resultPresentation(evaluation) === 'not_assessable' ? (
                  <Badge icon="minus">{t('calls.table.noScoreNotAssessable')}</Badge>
                ) : evaluation?.outcome === 'insufficient_evidence' ? (
                  <Badge tone="warning" icon="alert">
                    {t('calls.table.noScore')}
                  </Badge>
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
