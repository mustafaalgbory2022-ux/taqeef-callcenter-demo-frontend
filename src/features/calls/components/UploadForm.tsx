import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { sortAgents, useAgents } from '@/features/agents';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { describeError, describeFieldIssue } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Button, LinkButton } from '@/shared/ui/Button';
import { Checkbox, Field } from '@/shared/ui/Field';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { useUploadCall } from '../hooks/useCallData';
import {
  ACCEPT_ATTRIBUTE,
  CHANNEL_MAPS,
  MAX_DISPLAY_NAME,
  MAX_UPLOAD_MB,
  SERVER_UPLOAD_FIELD,
  validateUpload,
  type UploadField,
  type UploadValues,
} from '../model/upload';
import styles from './UploadForm.module.css';

// Contract v0.3 §5.1: as-built `unknown_agent`, `already_retired`; `agent_required` PROPOSED.
const AGENT_REASONS = ['agent_required', 'unknown_agent', 'already_retired'] as const;
const isAgentReason = (r: string): r is (typeof AGENT_REASONS)[number] =>
  (AGENT_REASONS as readonly string[]).includes(r);

const initial: UploadValues = {
  file: null,
  title: '',
  agentId: '',
  channelMap: '',
  confirmSynthetic: false,
};

export function UploadForm() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const agents = useAgents();
  const upload = useUploadCall();
  const [values, setValues] = useState<UploadValues>(initial);
  const [errors, setErrors] = useState<Partial<Record<UploadField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const active =
    agents.status === 'success' ? sortAgents(agents.data.filter((a) => a.status === 'active')) : [];
  const set = <K extends UploadField>(k: K, v: UploadValues[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const clientErrors = validateUpload(values);
    setErrors(Object.fromEntries(Object.entries(clientErrors).map(([k, key]) => [k, t(key)])));
    if (Object.keys(clientErrors).length > 0 || !values.file) return;
    try {
      const accepted = await upload.mutate({
        file: values.file,
        displayName: values.title,
        agentId: values.agentId,
        channelMap: values.channelMap || null,
      });
      toast('success', t('calls.upload.done', { id: accepted.callId }));
      navigate(`/calls/${encodeURIComponent(accepted.callId)}`);
    } catch (err) {
      const mapped = mapFieldIssues(err, SERVER_UPLOAD_FIELD, (issue) =>
        issue.field === 'agent_id' && isAgentReason(issue.reason)
          ? t(`calls.upload.errors.${issue.reason}`)
          : describeFieldIssue(issue, t),
      );
      if (mapped) setErrors(mapped.fields);
      if (!mapped || mapped.unmapped.length > 0) {
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
      }
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.file}>
        <Field
          label={t('calls.upload.file')}
          hint={t('calls.upload.fileHint', { mb: MAX_UPLOAD_MB })}
          required
          error={errors.file}
        >
          {(p) => (
            <input
              {...p}
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              onChange={(e) => set('file', e.target.files?.[0] ?? null)}
            />
          )}
        </Field>
      </div>
      <div className={styles.row}>
        <Field
          label={t('calls.upload.title')}
          hint={t('calls.upload.titleHint')}
          error={errors.title}
        >
          {(p) => (
            <input
              {...p}
              value={values.title}
              maxLength={MAX_DISPLAY_NAME}
              onChange={(e) => set('title', e.target.value)}
            />
          )}
        </Field>
        <Field label={t('agents.fields.name')} required error={errors.agentId}>
          {(p) => (
            <select {...p} value={values.agentId} onChange={(e) => set('agentId', e.target.value)}>
              <option value="">{t('calls.upload.selectAgent')}</option>
              {active.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <div className={styles.row}>
        <Field
          label={t('calls.upload.channelMap')}
          hint={t('calls.upload.channelMapHint')}
          error={errors.channelMap}
        >
          {(p) => (
            <select
              {...p}
              value={values.channelMap}
              onChange={(e) => set('channelMap', e.target.value as UploadValues['channelMap'])}
            >
              <option value="">{t('calls.upload.channelMapDefault')}</option>
              {CHANNEL_MAPS.map((m) => (
                <option key={m} value={m}>
                  {t(`calls.upload.channelMaps.${m}`)}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <div>
        <Checkbox checked={values.confirmSynthetic} onChange={(v) => set('confirmSynthetic', v)}>
          {t('calls.upload.confirm')}
        </Checkbox>
        {errors.confirmSynthetic && (
          <p className={styles.error} role="alert">
            {errors.confirmSynthetic}
          </p>
        )}
      </div>
      {formError && <Notice tone="danger" title={formError} />}
      <div className={styles.actions}>
        <Button variant="primary" type="submit" icon="upload" loading={upload.isPending}>
          {t('calls.upload.submit')}
        </Button>
        <LinkButton to="/calls">{t('common.cancel')}</LinkButton>
      </div>
    </form>
  );
}
