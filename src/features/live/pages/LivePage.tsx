import { useAgents, useQueues } from '@/features/agents';
import { combineQueries } from '@/shared/hooks/combineQueries';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { LiveAgentState } from '@/shared/types/domain';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import { StatTile } from '@/shared/ui/StatTile';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { formatDuration } from '@/shared/utils/time';
import styles from './Live.module.css';

const POLL_MS = 5000;
const STATE_TONE: Record<LiveAgentState, BadgeTone> = {
  available: 'success',
  ringing: 'accent',
  on_call: 'warning',
  paused: 'neutral',
  offline: 'neutral',
};

/** Live queue status, agent availability and active calls (polled; simulated in mock mode). */
export function LivePage() {
  const { t, fmt, pick } = useI18n();
  useDocumentTitle(t('live.title'), t('app.title'));
  const live = useApiQuery(['live'], (api) => api.getLiveStatus(), { refetchIntervalMs: POLL_MS });
  const query = combineQueries([live, useAgents(), useQueues()] as const);

  return (
    <>
      <PageHeader
        eyebrow={t('nav.operations')}
        title={t('live.title')}
        description={t('live.description')}
      />
      <QueryView query={query}>
        {([status, agents, queues]) => {
          const agentName = (id: string | null) =>
            agents.find((a) => a.id === id)?.displayName ?? '—';
          const queueName = (id: string) => {
            const q = queues.find((x) => x.id === id);
            return q ? `${q.number} · ${pick(q.name)}` : id;
          };
          return (
            <>
              {status.simulated && (
                <Notice tone="mock" title={t('live.simulatedTitle')} testId="live-simulated">
                  {t('live.simulatedBody', { s: POLL_MS / 1000 })}
                </Notice>
              )}
              <p className={styles.updated} aria-live="polite">
                {t('live.updated', { at: fmt.dateTime(status.generatedAt) })}
              </p>
              <section className={styles.queues} aria-label={t('live.queues')}>
                {status.queues.map((q) => (
                  <Card key={q.queueId} title={queueName(q.queueId)}>
                    <div className={styles.queueStats}>
                      <StatTile
                        label={t('live.waiting')}
                        value={fmt.integer(q.waiting)}
                        alert={q.waiting >= 3}
                      />
                      <StatTile
                        label={t('live.longestWait')}
                        value={formatDuration(q.longestWaitS * 1000)}
                      />
                      <StatTile label={t('live.activeCalls')} value={fmt.integer(q.activeCalls)} />
                      <StatTile
                        label={t('live.agentsAvailable')}
                        value={fmt.integer(q.agentsAvailable)}
                      />
                    </div>
                  </Card>
                ))}
              </section>
              <div className={styles.split}>
                <Card title={t('live.agents')} flush>
                  <TableRegion label={t('live.agents')}>
                    <thead>
                      <tr>
                        <th scope="col">{t('agents.fields.name')}</th>
                        <th scope="col">{t('live.state')}</th>
                        <th scope="col">{t('live.since')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.agents.map((a) => (
                        <tr key={a.agentId}>
                          <td>{agentName(a.agentId)}</td>
                          <td>
                            <Badge tone={STATE_TONE[a.state]}>{t(`live.states.${a.state}`)}</Badge>
                          </td>
                          <td className={tableStyles.mono}>
                            <bdi>
                              {a.state === 'offline' ? '—' : formatDuration(a.sinceS * 1000)}
                            </bdi>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </TableRegion>
                </Card>
                <Card title={t('live.calls')} caption={t('live.callsCaption')} flush>
                  <TableRegion label={t('live.calls')}>
                    <thead>
                      <tr>
                        <th scope="col">{t('queues.filter.label')}</th>
                        <th scope="col">{t('calls.table.caller')}</th>
                        <th scope="col">{t('live.state')}</th>
                        <th scope="col">{t('agents.fields.name')}</th>
                        <th scope="col">{t('calls.table.duration')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.calls.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <bdi>{queueName(c.queueId)}</bdi>
                          </td>
                          <td className={tableStyles.mono}>
                            <bdi>{c.callerMasked}</bdi>
                          </td>
                          <td>
                            <Badge
                              tone={
                                c.state === 'waiting'
                                  ? 'warning'
                                  : c.state === 'ringing'
                                    ? 'accent'
                                    : 'success'
                              }
                            >
                              {t(`live.callStates.${c.state}`)}
                            </Badge>
                          </td>
                          <td>{agentName(c.agentId)}</td>
                          <td className={tableStyles.mono}>
                            <bdi>{formatDuration(c.durationS * 1000)}</bdi>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </TableRegion>
                </Card>
              </div>
            </>
          );
        }}
      </QueryView>
    </>
  );
}
