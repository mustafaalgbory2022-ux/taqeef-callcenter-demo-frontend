import { useState } from 'react';
import { Link } from 'react-router';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { AiJob, AiJobState } from '@/shared/types/domain';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { QueryView } from '@/shared/ui/States';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { useToast } from '@/shared/ui/Toaster';
import { useAiJobs, useJobAction, type JobAction } from '../hooks/useAiAdmin';
import { canCancel, canRetry, jobCounts } from '../model/aiConfig';

const TONE: Record<AiJobState, BadgeTone> = {
  queued: 'neutral',
  running: 'accent',
  completed: 'success',
  failed: 'danger',
  cancelled: 'neutral',
};

/** Processing queue controls: pause/resume, retry failed jobs, cancel queued/running jobs. */
export function JobQueuePanel({ retryLimit }: { retryLimit: number }) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const canManage = usePermission('ai.manage');
  const jobs = useAiJobs();
  const action = useJobAction();
  const [confirm, setConfirm] = useState<JobAction | null>(null);

  async function run(a: JobAction) {
    await action.mutate(a);
    toast('success', t(`aiAdmin.jobs.done.${a.kind}`));
  }
  async function runDirect(a: JobAction) {
    try {
      await run(a);
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }

  return (
    <Card
      title={t('aiAdmin.jobs.title')}
      caption={t('aiAdmin.jobs.caption')}
      actions={
        canManage &&
        jobs.data &&
        (jobs.data.paused ? (
          <Button
            icon="play"
            loading={action.isPending}
            onClick={() => runDirect({ kind: 'resume' })}
          >
            {t('aiAdmin.jobs.resume')}
          </Button>
        ) : (
          <Button icon="pause" onClick={() => setConfirm({ kind: 'pause' })}>
            {t('aiAdmin.jobs.pause')}
          </Button>
        ))
      }
      flush
    >
      <QueryView query={jobs}>
        {(q) => {
          const counts = jobCounts(q.jobs);
          return (
            <>
              <div className={layout.toolbar}>
                <span>
                  {q.paused ? (
                    <Badge tone="warning" icon="pause">
                      {t('aiAdmin.jobs.paused')}
                    </Badge>
                  ) : (
                    <Badge tone="success" icon="play">
                      {t('aiAdmin.jobs.running')}
                    </Badge>
                  )}{' '}
                  {q.simulated && <Badge tone="mock">{t('common.simulated')}</Badge>}
                </span>
                <span className={layout.muted} data-testid="job-counts">
                  {t('aiAdmin.jobs.counts', counts)}
                </span>
              </div>
              <TableRegion label={t('aiAdmin.jobs.table')}>
                <thead>
                  <tr>
                    <th scope="col">{t('aiAdmin.jobs.call')}</th>
                    <th scope="col">{t('aiAdmin.jobs.stage')}</th>
                    <th scope="col">{t('aiAdmin.jobs.state')}</th>
                    <th scope="col">{t('aiAdmin.jobs.attempts')}</th>
                    <th scope="col">{t('aiAdmin.jobs.updated')}</th>
                    <th scope="col">
                      <span className="visually-hidden">{t('common.actions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {q.jobs.map((job: AiJob) => (
                    <tr key={job.id} data-testid={`job-${job.id}`}>
                      <td className={tableStyles.mono}>
                        <Link to={`/calls/${encodeURIComponent(job.callId)}`}>
                          <bdi>{job.callId}</bdi>
                        </Link>
                      </td>
                      <td>{t(`aiAdmin.jobs.stages.${job.stage}`)}</td>
                      <td className={tableStyles.wrap}>
                        <Badge tone={TONE[job.state]}>
                          {t(`aiAdmin.jobs.states.${job.state}`)}
                        </Badge>
                        {job.error && <div className={tableStyles.muted}>{job.error}</div>}
                      </td>
                      <td>
                        <bdi>{job.attempts}</bdi>
                      </td>
                      <td className={tableStyles.muted}>
                        <bdi>{fmt.dateTime(job.updatedAt)}</bdi>
                      </td>
                      <td>
                        {canManage && canRetry(job, retryLimit) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="refresh"
                            onClick={() => runDirect({ kind: 'retry', id: job.id })}
                          >
                            {t('aiAdmin.jobs.retry')}
                            <span className="visually-hidden"> — {job.callId}</span>
                          </Button>
                        )}
                        {canManage && job.state === 'failed' && !canRetry(job, retryLimit) && (
                          <span className={tableStyles.muted}>
                            {t('aiAdmin.jobs.limitReached')}
                          </span>
                        )}
                        {canManage && canCancel(job) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="close"
                            onClick={() => setConfirm({ kind: 'cancel', id: job.id })}
                          >
                            {t('aiAdmin.jobs.cancel')}
                            <span className="visually-hidden"> — {job.callId}</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableRegion>
            </>
          );
        }}
      </QueryView>
      {!canManage && <Notice tone="info" title={t('common.readOnly')} />}
      {confirm && (
        <ConfirmDialog
          title={t(
            confirm.kind === 'pause' ? 'aiAdmin.jobs.pauseTitle' : 'aiAdmin.jobs.cancelTitle',
          )}
          confirmLabel={t(confirm.kind === 'pause' ? 'aiAdmin.jobs.pause' : 'aiAdmin.jobs.cancel')}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await run(confirm);
            setConfirm(null);
          }}
        >
          <p>
            {t(confirm.kind === 'pause' ? 'aiAdmin.jobs.pauseBody' : 'aiAdmin.jobs.cancelBody')}
          </p>
        </ConfirmDialog>
      )}
    </Card>
  );
}
