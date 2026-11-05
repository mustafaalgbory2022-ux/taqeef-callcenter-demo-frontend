import { useState, type FormEvent } from 'react';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { describeError, describeFieldIssue } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Agent, AgentInput } from '@/shared/types/domain';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { Field } from '@/shared/ui/Field';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { useCreateAgent } from '../hooks/useAgentData';
import { emptyAgentInput, SERVER_FIELD, validateAgent, type AgentField } from '../model/agents';
import styles from './AgentFormDialog.module.css';

export interface AgentFormDialogProps {
  /** All agents, retired included (names are unique across all of them). */
  agents: readonly Agent[];
  onClose: () => void;
}

/** Create an agent. Names are immutable: to rename, retire the agent and create a new one. */
export function AgentFormDialog({ agents, onClose }: AgentFormDialogProps) {
  const { t } = useI18n();
  const toast = useToast();
  const create = useCreateAgent();
  const [values, setValues] = useState<AgentInput>(emptyAgentInput);
  const [errors, setErrors] = useState<Partial<Record<AgentField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const pending = create.isPending;

  const set = <K extends keyof AgentInput>(key: K, value: AgentInput[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const clientErrors = validateAgent(values, agents);
    setErrors(Object.fromEntries(Object.entries(clientErrors).map(([k, key]) => [k, t(key)])));
    if (Object.keys(clientErrors).length > 0) return;
    try {
      await create.mutate(values);
      toast('success', t('agents.form.created', { name: values.displayName.trim() }));
      onClose();
    } catch (err) {
      const mapped = mapFieldIssues(err, SERVER_FIELD, (issue) =>
        issue.reason === 'duplicate'
          ? t(
              issue.field === 'extension'
                ? 'agents.form.errors.extensionTaken'
                : 'agents.form.errors.nameTaken',
            )
          : describeFieldIssue(issue, t),
      );
      if (mapped) setErrors(mapped.fields);
      if (!mapped || mapped.unmapped.length > 0) {
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
      }
    }
  }

  const formId = 'agent-form';
  return (
    <Dialog
      open
      title={t('agents.form.createTitle')}
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
      <Notice tone="info" title={t('agents.form.immutableNote')} />
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
        </div>
      </form>
      {formError && <Notice tone="danger" title={formError} />}
      <Notice tone="mock">{t('agents.form.syntheticNote')}</Notice>
    </Dialog>
  );
}
