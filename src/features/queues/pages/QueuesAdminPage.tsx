import { useState } from 'react';
import { useAgents, useQueues } from '@/features/agents';
import { combineQueries } from '@/shared/hooks/combineQueries';
import { useAdminAudit } from '@/shared/hooks/useAdminAudit';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePermission } from '@/shared/hooks/usePermission';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Queue } from '@/shared/types/domain';
import { AuditTrail } from '@/shared/ui/AuditTrail';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Dialog } from '@/shared/ui/Dialog';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import { useToast } from '@/shared/ui/Toaster';
import { QueueAgentsDialog } from '../components/QueueAgentsDialog';
import { QueueFormDialog } from '../components/QueueFormDialog';
import { QueuesTable } from '../components/QueuesTable';
import { useSetQueueStatus } from '../hooks/useQueueAdmin';
import { assignedAgents, isActive, sortQueues } from '../model/queues';

type DialogState =
  | { kind: 'none' }
  | { kind: 'form'; queue: Queue | null }
  | { kind: 'agents'; queue: Queue }
  | { kind: 'status'; queue: Queue }
  | { kind: 'history'; queue: Queue };

function QueueHistoryDialog({ queue, onClose }: { queue: Queue; onClose: () => void }) {
  const { t } = useI18n();
  const history = useAdminAudit('queues', 'queue', queue.id);
  return (
    <Dialog open title={t('queueAdmin.history.title', { number: queue.number })} onClose={onClose}>
      <AuditTrail query={history} />
    </Dialog>
  );
}

/** Add, edit and disable Yeastar queues and their agent assignments. Queues are never deleted. */
export function QueuesAdminPage() {
  const { t, pick } = useI18n();
  useDocumentTitle(t('queueAdmin.title'), t('app.title'));
  const toast = useToast();
  const canManage = usePermission('queues.manage');
  const query = combineQueries([useQueues(), useAgents()] as const);
  const recent = useAdminAudit('queues', 'queue');
  const setStatus = useSetQueueStatus();
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const close = () => setDialog({ kind: 'none' });
  const [queues, agents] = query.data ?? [[], []];

  return (
    <>
      <PageHeader
        eyebrow={t('nav.administration')}
        title={t('queueAdmin.title')}
        description={t('queueAdmin.description')}
        actions={
          canManage && (
            <Button
              variant="primary"
              icon="plus"
              onClick={() => setDialog({ kind: 'form', queue: null })}
            >
              {t('queueAdmin.add')}
            </Button>
          )
        }
      />
      <Notice tone="mock" title={t('queueAdmin.syntheticTitle')}>
        {t('queueAdmin.syntheticBody')}
      </Notice>
      {!canManage && <Notice tone="info" title={t('common.readOnly')} />}
      <Card
        title={t('queueAdmin.listTitle')}
        caption={t('queueAdmin.listCaption', {
          count: queues.length,
          active: queues.filter(isActive).length,
        })}
        flush
      >
        <QueryView query={query}>
          {([qs, as]) => (
            <QueuesTable
              queues={sortQueues(qs)}
              agents={as}
              canManage={canManage}
              onEdit={(queue) => setDialog({ kind: 'form', queue })}
              onAgents={(queue) => setDialog({ kind: 'agents', queue })}
              onToggle={(queue) => setDialog({ kind: 'status', queue })}
              onHistory={(queue) => setDialog({ kind: 'history', queue })}
            />
          )}
        </QueryView>
      </Card>
      <Card title={t('queueAdmin.history.recent')} caption={t('admin.audit.caption')}>
        <AuditTrail query={recent} limit={8} />
      </Card>

      {dialog.kind === 'form' && (
        <QueueFormDialog queue={dialog.queue} queues={queues} onClose={close} />
      )}
      {dialog.kind === 'agents' && (
        <QueueAgentsDialog queue={dialog.queue} agents={agents} onClose={close} />
      )}
      {dialog.kind === 'history' && <QueueHistoryDialog queue={dialog.queue} onClose={close} />}
      {dialog.kind === 'status' &&
        (() => {
          const q = dialog.queue;
          const disabling = isActive(q);
          const name = `${q.number} ${pick(q.name)}`;
          return (
            <ConfirmDialog
              title={t(
                disabling ? 'queueAdmin.status.disableTitle' : 'queueAdmin.status.enableTitle',
                {
                  name,
                },
              )}
              confirmLabel={t(disabling ? 'queueAdmin.status.disable' : 'queueAdmin.status.enable')}
              tone={disabling ? 'danger' : 'primary'}
              acknowledge={disabling ? t('queueAdmin.status.disableAck') : undefined}
              onClose={close}
              onConfirm={async () => {
                await setStatus.mutate({ id: q.id, status: disabling ? 'disabled' : 'active' });
                toast(
                  'success',
                  t(
                    disabling
                      ? 'queueAdmin.status.disabledToast'
                      : 'queueAdmin.status.enabledToast',
                    {
                      name,
                    },
                  ),
                );
                close();
              }}
            >
              <p>
                {t(disabling ? 'queueAdmin.status.disableBody' : 'queueAdmin.status.enableBody', {
                  n: assignedAgents(q.id, agents).length,
                })}
              </p>
            </ConfirmDialog>
          );
        })()}
    </>
  );
}
