import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Agent } from '@/shared/types/domain';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { useToast } from '@/shared/ui/Toaster';
import { useUpdateAgent } from '../hooks/useAgentData';

/** Confirmation before disabling (or re-enabling) an agent. History is always kept. */
export function ConfirmStatusDialog({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const update = useUpdateAgent();
  const disabling = agent.status === 'active';

  async function confirm() {
    try {
      await update.mutate({ id: agent.id, patch: { status: disabling ? 'inactive' : 'active' } });
      toast(
        'success',
        t(disabling ? 'agents.status.disabledToast' : 'agents.status.enabledToast', {
          name: agent.displayName,
        }),
      );
      onClose();
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }

  return (
    <Dialog
      open
      title={t(disabling ? 'agents.status.disableTitle' : 'agents.status.enableTitle', {
        name: agent.displayName,
      })}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant={disabling ? 'danger' : 'primary'}
            loading={update.isPending}
            onClick={confirm}
          >
            {t(disabling ? 'agents.status.disable' : 'agents.status.enable')}
          </Button>
        </>
      }
    >
      <p>{t(disabling ? 'agents.status.disableBody' : 'agents.status.enableBody')}</p>
    </Dialog>
  );
}
