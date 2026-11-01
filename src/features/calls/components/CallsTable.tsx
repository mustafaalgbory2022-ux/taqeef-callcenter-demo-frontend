import { Link } from 'react-router';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Agent, Call, Evaluation, Queue, ScorecardVersion } from '@/shared/types/domain';
import { Badge, SyntheticBadge } from '@/shared/ui/Badge';
import { ScoreFlag, ScoreValue } from '@/shared/ui/ScoreValue';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { DEFAULT_LOW_SCORE_THRESHOLD } from '@/shared/utils/score';
import { formatDuration } from '@/shared/utils/time';
import { CallStatusBadge } from './CallStatusBadge';
import { ReviewBadge } from './ReviewBadge';

export interface CallsTableProps {
  calls: readonly Call[];
  agents: readonly Agent[];
  queues: readonly Queue[];
  /** Current (latest eligible) evaluation per call id. */
  current: ReadonlyMap<string, Evaluation>;
  versions: readonly ScorecardVersion[];
  label: string;
}

export function CallsTable({ calls, agents, queues, current, versions, label }: CallsTableProps) {
  const { t, fmt } = useI18n();
  const agentOf = (id: string | null) => agents.find((a) => a.id === id);
  const thresholdOf = (e: Evaluation) =>
    versions.find((v) => v.scorecardId === e.scorecardId && v.version === e.scorecardVersion)
      ?.lowScoreThreshold ?? DEFAULT_LOW_SCORE_THRESHOLD;

  return (
    <TableRegion label={label}>
      <thead>
        <tr>
          <th scope="col">{t('calls.table.call')}</th>
          <th scope="col">{t('calls.table.topic')}</th>
          <th scope="col">{t('agents.fields.name')}</th>
          <th scope="col">{t('queues.filter.label')}</th>
          <th scope="col">{t('calls.table.caller')}</th>
          <th scope="col">{t('calls.table.recorded')}</th>
          <th scope="col">{t('calls.table.duration')}</th>
          <th scope="col">{t('calls.table.status')}</th>
          <th scope="col">{t('calls.table.score')}</th>
          <th scope="col">{t('calls.review.label')}</th>
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
                {call.classification && (
                  <span className={tableStyles.muted}>
                    {' · '}
                    {t(`insights.reasons.${call.classification.reason}`)}
                    {call.classification.complaint && ` · ${t('insights.complaint')}`}
                  </span>
                )}
              </td>
              <td>
                {agent ? (
                  <Link to={`/agents/${encodeURIComponent(agent.id)}`}>{agent.displayName}</Link>
                ) : (
                  '—'
                )}
              </td>
              <td className={tableStyles.mono}>
                <bdi>{queues.find((q) => q.id === call.queueId)?.number ?? '—'}</bdi>
              </td>
              <td className={tableStyles.mono}>
                <bdi>{call.callerMasked ?? '—'}</bdi>
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
                {evaluation?.overallScore != null ? (
                  <>
                    <ScoreValue score={evaluation.overallScore} />{' '}
                    <ScoreFlag
                      score={evaluation.overallScore}
                      threshold={thresholdOf(evaluation)}
                    />
                  </>
                ) : evaluation?.outcome === 'insufficient_evidence' ? (
                  <Badge tone="warning" icon="alert">
                    {t('calls.table.noScore')}
                  </Badge>
                ) : (
                  <span className={tableStyles.muted}>—</span>
                )}
              </td>
              <td>
                <ReviewBadge status={call.review.status} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </TableRegion>
  );
}
