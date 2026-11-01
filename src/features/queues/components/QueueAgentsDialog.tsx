import { useMemo, useState } from 'react';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Agent, Queue } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { Checkbox } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { useAssignQueueAgents } from '../hooks/useQueueAdmin';
import { assignmentDiff, isActive } from '../model/queues';

/** Assign agents to a queue. Removals are destructive and need an explicit acknowledgement. */
export function QueueAgentsDialog({
  queue,
  agents,
  onClose,
}: {
  queue: Queue;
  agents: readonly Agent[];
  onClose: () => void;
}) {
  const { t, pick } = useI18n();
  const toast = useToast();
  const assign = useAssignQueueAgents();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(agents.filter((a) => a.queueIds.includes(queue.id)).map((a) => a.id)),
  );
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const diff = useMemo(
    () => assignmentDiff(queue.id, agents, selected),
    [queue.id, agents, selected],
  );
  const active = isActive(queue);
  const changed = diff.added.length + diff.removed.length > 0;
  const sorted = [...agents].sort((a, b) => a.displayName.localeCompare(b.displayName));

  const toggle = (id: string, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  async function save() {
    setError(null);
    try {
      await assign.mutate({ id: queue.id, agentIds: [...selected], confirm: ack });
      toast('success', t('queueAdmin.agents.saved', { number: queue.number }));
      onClose();
    } catch (err) {
      setError(describeError(err, t));
    }
  }

  return (
    <Dialog
      open
      title={t('queueAdmin.agents.title', { number: queue.number, name: pick(queue.name) })}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="primary"
            loading={assign.isPending}
            disabled={!changed || (diff.removed.length > 0 && !ack)}
            onClick={save}
          >
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className={layout.stack}>
        {!active && <Notice tone="warning" title={t('queueAdmin.agents.disabledQueue')} />}
        <fieldset className={layout.checks}>
          <legend>{t('queueAdmin.agents.legend')}</legend>
          {sorted.map((a) => {
            const assigned = a.queueIds.includes(queue.id);
            return (
              <div key={a.id}>
                {!active && !assigned ? (
                  <span className={layout.muted}>{a.displayName}</span>
                ) : (
                  <Checkbox checked={selected.has(a.id)} onChange={(on) => toggle(a.id, on)}>
                    {a.displayName} <bdi className={layout.mono}>{a.extension}</bdi>{' '}
                    {a.status === 'inactive' && <Badge>{t('agents.status.inactive')}</Badge>}
                  </Checkbox>
                )}
              </div>
            );
          })}
        </fieldset>
        {changed && (
          <p className={layout.muted} data-testid="assignment-diff">
            {t('queueAdmin.agents.diff', {
              added: diff.added.length,
              removed: diff.removed.length,
            })}
          </p>
        )}
        {diff.removed.length > 0 && (
          <Notice tone="warning" title={t('queueAdmin.agents.removeTitle')}>
            <p>
              {t('queueAdmin.agents.removeBody', {
                names: diff.removed.map((a) => a.displayName).join(', '),
              })}
            </p>
            <Checkbox checked={ack} onChange={setAck}>
              {t('queueAdmin.agents.removeAck')}
            </Checkbox>
          </Notice>
        )}
        {error && <Notice tone="danger" title={error} />}
      </div>
    </Dialog>
  );
}
