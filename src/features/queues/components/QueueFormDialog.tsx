import { useState, type FormEvent } from 'react';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Queue, QueueInput } from '@/shared/types/domain';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { Checkbox, Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { useCreateQueue, useUpdateQueue } from '../hooks/useQueueAdmin';
import {
  emptyQueueInput,
  needsRenumberConfirmation,
  QUEUE_SERVER_FIELD,
  toQueueInput,
  validateQueue,
  type QueueField,
} from '../model/queues';

export function QueueFormDialog({
  queue,
  queues,
  onClose,
}: {
  queue: Queue | null;
  queues: readonly Queue[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const create = useCreateQueue();
  const update = useUpdateQueue();
  const [values, setValues] = useState<QueueInput>(queue ? toQueueInput(queue) : emptyQueueInput);
  const [errors, setErrors] = useState<Partial<Record<QueueField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [ack, setAck] = useState(false);
  const renumber = needsRenumberConfirmation(queue, values);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const clientErrors = validateQueue(values, queues, queue?.id ?? null);
    setErrors(Object.fromEntries(Object.entries(clientErrors).map(([k, key]) => [k, t(key)])));
    if (Object.keys(clientErrors).length > 0) return;
    if (renumber && !ack) {
      setFormError(t('queueAdmin.form.ackRequired'));
      return;
    }
    try {
      if (queue) await update.mutate({ id: queue.id, patch: values, confirm: renumber && ack });
      else await create.mutate(values);
      toast(
        'success',
        t(queue ? 'queueAdmin.form.updated' : 'queueAdmin.form.created', {
          number: values.number.trim(),
        }),
      );
      onClose();
    } catch (err) {
      const mapped = mapFieldIssues(err, QUEUE_SERVER_FIELD);
      if (mapped) setErrors(mapped.fields);
      if (!mapped || mapped.unmapped.length > 0)
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
    }
  }

  const formId = 'queue-form';
  return (
    <Dialog
      open
      title={queue ? t('queueAdmin.form.editTitle') : t('queueAdmin.form.createTitle')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="primary"
            type="submit"
            form={formId}
            loading={create.isPending || update.isPending}
          >
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className={layout.form}>
        <div className={layout.row}>
          <Field
            label={t('queueAdmin.fields.number')}
            hint={t('queueAdmin.form.numberHint')}
            required
            error={errors.number}
          >
            {(p) => (
              <input
                {...p}
                value={values.number}
                dir="ltr"
                inputMode="numeric"
                autoComplete="off"
                onChange={(e) => setValues((v) => ({ ...v, number: e.target.value }))}
              />
            )}
          </Field>
          <Field label={t('queueAdmin.fields.nameEn')} required error={errors.nameEn}>
            {(p) => (
              <input
                {...p}
                value={values.name.en}
                lang="en"
                dir="ltr"
                maxLength={60}
                onChange={(e) =>
                  setValues((v) => ({ ...v, name: { ...v.name, en: e.target.value } }))
                }
              />
            )}
          </Field>
          <Field label={t('queueAdmin.fields.nameAr')} required error={errors.nameAr}>
            {(p) => (
              <input
                {...p}
                value={values.name.ar}
                lang="ar"
                dir="rtl"
                maxLength={60}
                onChange={(e) =>
                  setValues((v) => ({ ...v, name: { ...v.name, ar: e.target.value } }))
                }
              />
            )}
          </Field>
        </div>
        <Field label={t('queueAdmin.fields.description')} error={errors.description}>
          {(p) => (
            <textarea
              {...p}
              rows={2}
              maxLength={200}
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            />
          )}
        </Field>
        {renumber && (
          <Notice tone="warning" title={t('queueAdmin.form.renumberTitle')}>
            <p>
              {t('queueAdmin.form.renumberBody', { from: queue?.number ?? '', to: values.number })}
            </p>
            <Checkbox checked={ack} onChange={setAck}>
              {t('queueAdmin.form.renumberAck')}
            </Checkbox>
          </Notice>
        )}
      </form>
      {formError && <Notice tone="danger" title={formError} />}
      <Notice tone="mock">{t('queueAdmin.syntheticNote')}</Notice>
    </Dialog>
  );
}
