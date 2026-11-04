import { useState, type FormEvent } from 'react';
import { focusFirstInvalid } from '@/shared/ui/focusInvalid';
import { useNavigate } from 'react-router';
import { sortAgents, useAgents } from '@/features/agents';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Button, LinkButton } from '@/shared/ui/Button';
import { Checkbox, Field } from '@/shared/ui/Field';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { useUploadCall } from '../hooks/useCallData';
import {
  ACCEPT_ATTRIBUTE,
  MAX_UPLOAD_MB,
  SERVER_UPLOAD_FIELD,
  validateUpload,
  type UploadField,
  type UploadValues,
} from '../model/upload';
import styles from './UploadForm.module.css';

const initial: UploadValues = { file: null, title: '', agentId: '', confirmSynthetic: false };

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

  async function submit(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    e.preventDefault();
    setFormError(null);
    const clientErrors = validateUpload(values);
    setErrors(Object.fromEntries(Object.entries(clientErrors).map(([k, key]) => [k, t(key)])));
    if (Object.keys(clientErrors).length > 0 || !values.file) return;
    try {
      const call = await upload.mutate({
        file: values.file,
        title: values.title,
        agentId: values.agentId,
      });
      toast('success', t('calls.upload.done', { id: call.id }));
      navigate(`/calls/${encodeURIComponent(call.id)}`);
    } catch (err) {
      const mapped = mapFieldIssues(err, SERVER_UPLOAD_FIELD);
      if (mapped) setErrors(mapped.fields);
      focusFirstInvalid(form);
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
        <Field label={t('calls.upload.title')} required error={errors.title}>
          {(p) => (
            <input
              {...p}
              value={values.title}
              maxLength={120}
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
                  {a.displayName} · {a.extension}
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
