import { ApiError } from '@/shared/api/errors';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Agent } from '@/shared/types/domain';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { useToast } from '@/shared/ui/Toaster';
import { useRetireAgent } from '../hooks/useAgentData';

/**
 * Confirmation before retiring an agent. Retirement is permanent: the agent is never
 * reactivated or deleted, and its calls keep their agent (contract v0.2.1 §A).
 */
export function ConfirmStatusDialog({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const retire = useRetireAgent();

  async function confirm() {
    try {
      await retire.mutate(agent.id);
      toast('success', t('agents.status.retiredToast', { name: agent.displayName }));
      onClose();
    } catch (err) {
      // As-built refusals (contract v0.3 §4.3): unknown_agent → 404, already_retired → 409.
      const reason = err instanceof ApiError ? err.fieldIssues[0]?.reason : undefined;
      toast(
        'error',
        reason === 'unknown_agent' || (err instanceof ApiError && err.code === 'not_found')
          ? t('agents.status.unknownAgent')
          : reason === 'already_retired' || (err instanceof ApiError && err.code === 'conflict')
            ? t('agents.status.alreadyRetired')
            : describeError(err, t),
      );
    }
  }

  return (
    <Dialog
      open
      title={t('agents.status.retireTitle', { name: agent.displayName })}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="danger" loading={retire.isPending} onClick={confirm}>
            {t('agents.status.retire')}
          </Button>
        </>
      }
    >
      <p>{t('agents.status.retireBody')}</p>
    </Dialog>
  );
}
