import { useState } from 'react';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Call } from '@/shared/types/domain';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { Field } from '@/shared/ui/Field';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { useHideCall, useRestoreCall } from '../hooks/useCallData';

/** Contract v0.3 §5.4: optional reason, 0–500 characters. */
export const MAX_HIDE_REASON = 500;

/**
 * Soft delete ("hide") and restore (contract v0.3 §5.4; audited soft delete CONFIRMED).
 * Hiding keeps the recording, transcripts, evaluations and history; hidden calls leave the
 * default lists and the dashboard. Every action sends a new `request_id`.
 */
export function HideRestore({ call }: { call: Call }) {
  const { t } = useI18n();
  const toast = useToast();
  const allowed = usePermission('calls.upload');
  const hide = useHideCall();
  const restore = useRestoreCall();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  async function confirmHide() {
    try {
      await hide.mutate({ id: call.id, reason });
      toast('success', t('calls.hidden.hiddenToast'));
      setOpen(false);
      setReason('');
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }

  async function confirmRestore() {
    try {
      await restore.mutate(call.id);
      toast('success', t('calls.hidden.restoredToast'));
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }

  if (call.hidden) {
    return (
      <Notice tone="warning" title={t('calls.hidden.title')} testId="call-hidden">
        {t('calls.hidden.body')}{' '}
        {allowed && (
          <Button size="sm" onClick={confirmRestore} loading={restore.isPending}>
            {t('calls.hidden.restore')}
          </Button>
        )}
      </Notice>
    );
  }
  if (!allowed) return null;
  return (
    <>
      <div>
        <Button size="sm" variant="ghost" icon="minus" onClick={() => setOpen(true)}>
          {t('calls.hidden.hide')}
        </Button>
      </div>
      {open && (
        <Dialog
          open
          title={t('calls.hidden.confirmTitle')}
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
              <Button variant="danger" loading={hide.isPending} onClick={confirmHide}>
                {t('calls.hidden.hide')}
              </Button>
            </>
          }
        >
          <p>{t('calls.hidden.confirmBody')}</p>
          <Field label={t('calls.hidden.reason')} hint={t('calls.hidden.reasonHint')}>
            {(p) => (
              <textarea
                {...p}
                value={reason}
                maxLength={MAX_HIDE_REASON}
                rows={3}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
          </Field>
        </Dialog>
      )}
    </>
  );
}
