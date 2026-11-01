import { useState, type ReactNode } from 'react';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Checkbox } from './Field';
import { Notice } from './Notice';

export interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  /** When set, the confirm button stays disabled until this acknowledgement is ticked. */
  acknowledge?: string | undefined;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/**
 * Confirmation for destructive or far-reaching changes (GUI-X3). Errors are shown inside the
 * dialog so the administrator can retry or cancel.
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  tone = 'danger',
  acknowledge,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  const [ack, setAck] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(describeError(err, t));
      setPending(false);
    }
  }

  return (
    <Dialog
      open
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant={tone}
            loading={pending}
            disabled={Boolean(acknowledge) && !ack}
            onClick={confirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {acknowledge && (
        <Checkbox checked={ack} onChange={setAck}>
          {acknowledge}
        </Checkbox>
      )}
      {error && <Notice tone="danger" title={error} />}
    </Dialog>
  );
}
