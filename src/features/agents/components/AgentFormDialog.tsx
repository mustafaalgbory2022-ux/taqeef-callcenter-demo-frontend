import { useState, type FormEvent } from 'react';
import { focusFirstInvalid } from '@/shared/ui/focusInvalid';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Agent, AgentInput } from '@/shared/types/domain';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { Checkbox, Field } from '@/shared/ui/Field';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { useCreateAgent, useQueues, useUpdateAgent } from '../hooks/useAgentData';
import {
  emptyAgentInput,
  SERVER_FIELD,
  toAgentInput,
  validateAgent,
  type AgentField,
} from '../model/agents';
import styles from './AgentFormDialog.module.css';

export interface AgentFormDialogProps {
  /** Agent being edited, or null to create a new one. */
  agent: Agent | null;
  agents: readonly Agent[];
  onClose: () => void;
}

export function AgentFormDialog({ agent, agents, onClose }: AgentFormDialogProps) {
  const { t, pick } = useI18n();
  const toast = useToast();
  const queues = useQueues();
  const create = useCreateAgent();
  const update = useUpdateAgent();
  const [values, setValues] = useState<AgentInput>(agent ? toAgentInput(agent) : emptyAgentInput);
  const [errors, setErrors] = useState<Partial<Record<AgentField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const set = <K extends keyof AgentInput>(key: K, value: AgentInput[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const toggleQueue = (id: string, on: boolean) =>
    set('queueIds', on ? [...values.queueIds, id] : values.queueIds.filter((q) => q !== id));

  async function submit(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    e.preventDefault();
    setFormError(null);
    const clientErrors = validateAgent(values, agents, agent?.id ?? null);
    setErrors(Object.fromEntries(Object.entries(clientErrors).map(([k, key]) => [k, t(key)])));
    if (Object.keys(clientErrors).length > 0) return;
    try {
      if (agent) await update.mutate({ id: agent.id, patch: values });
      else await create.mutate(values);
      toast(
        'success',
        t(agent ? 'agents.form.updated' : 'agents.form.created', {
          name: values.displayName.trim(),
        }),
      );
      onClose();
    } catch (err) {
      const mapped = mapFieldIssues(err, SERVER_FIELD);
      if (mapped) setErrors(mapped.fields);
      focusFirstInvalid(form);
      if (!mapped || mapped.unmapped.length > 0) {
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
      }
    }
  }

  const formId = 'agent-form';
  return (
    <Dialog
      open
      title={agent ? t('agents.form.editTitle') : t('agents.form.createTitle')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit" form={formId} loading={pending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate>
        <div className={styles.row}>
          <Field label={t('agents.fields.name')} required error={errors.displayName}>
            {(p) => (
              <input
                {...p}
                value={values.displayName}
                maxLength={80}
                autoComplete="off"
                onChange={(e) => set('displayName', e.target.value)}
              />
            )}
          </Field>
          <Field
            label={t('agents.fields.extension')}
            hint={t('agents.form.extensionHint')}
            required
            error={errors.extension}
          >
            {(p) => (
              <input
                {...p}
                value={values.extension}
                dir="ltr"
                autoComplete="off"
                onChange={(e) => set('extension', e.target.value)}
              />
            )}
          </Field>
          <Field label={t('agents.fields.status')} error={errors.status}>
            {(p) => (
              <select
                {...p}
                value={values.status}
                onChange={(e) =>
                  set('status', e.target.value === 'inactive' ? 'inactive' : 'active')
                }
              >
                <option value="active">{t('agents.status.active')}</option>
                <option value="inactive">{t('agents.status.inactive')}</option>
              </select>
            )}
          </Field>
        </div>
        <fieldset className={styles.queues}>
          <legend>{t('agents.fields.queues')}</legend>
          {queues.status === 'success' &&
            queues.data
              // Disabled queues accept no new agents; existing assignments can still be removed.
              .filter((q) => q.status !== 'disabled' || agent?.queueIds.includes(q.id))
              .map((q) => (
                <Checkbox
                  key={q.id}
                  checked={values.queueIds.includes(q.id)}
                  onChange={(on) => toggleQueue(q.id, on)}
                >
                  {pick(q.name)}
                  {q.status === 'disabled' && ` (${t('queueAdmin.status.disabled')})`}
                </Checkbox>
              ))}
          {errors.queueIds && <Notice tone="danger" title={errors.queueIds} />}
        </fieldset>
      </form>
      {formError && <Notice tone="danger" title={formError} />}
      <Notice tone="mock">{t('agents.form.syntheticNote')}</Notice>
    </Dialog>
  );
}
