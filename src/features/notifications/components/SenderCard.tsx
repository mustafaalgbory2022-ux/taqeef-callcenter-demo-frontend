import { useState, type FormEvent } from 'react';
import { focusFirstInvalid } from '@/shared/ui/focusInvalid';
import type { ConnectionTestResult } from '@/shared/api/adapters/notifications';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { EmailSender, EmailSenderInput, SenderState } from '@/shared/types/domain';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { isEmail } from '@/shared/utils/emailRules';
import { useSaveSender, useSendTestEmail, useTestSender } from '../hooks/useNotifications';
import {
  SENDER_SERVER_FIELD,
  toSenderInput,
  validateSender,
  type SenderField,
} from '../model/notifications';

const TONE: Record<SenderState, BadgeTone> = {
  not_configured: 'warning',
  configured: 'accent',
  verified: 'success',
  error: 'danger',
};

const FIELDS: { key: Exclude<SenderField, 'secret'>; dir: 'ltr'; required: boolean }[] = [
  { key: 'senderAddress', dir: 'ltr', required: true },
  { key: 'displayName', dir: 'ltr', required: false },
  { key: 'tenantId', dir: 'ltr', required: true },
  { key: 'clientId', dir: 'ltr', required: true },
  { key: 'replyTo', dir: 'ltr', required: false },
];

/** Dedicated Microsoft 365 sender: settings, write-only secret, connection test and test email. */
export function SenderCard({ sender }: { sender: EmailSender }) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const canManage = usePermission('notifications.manage');
  const save = useSaveSender();
  const test = useTestSender();
  const testEmail = useSendTestEmail();
  const [v, setV] = useState<EmailSenderInput>(() => toSenderInput(sender));
  const [errors, setErrors] = useState<Partial<Record<SenderField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<ConnectionTestResult | null>(null);
  const [to, setTo] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    e.preventDefault();
    setFormError(null);
    const client = validateSender(v, sender.credentialSet);
    setErrors(Object.fromEntries(Object.entries(client).map(([k, key]) => [k, t(key)])));
    if (Object.keys(client).length > 0) {
      focusFirstInvalid(form);
      return;
    }
    try {
      await save.mutate(v);
      setV((x) => ({ ...x, secret: '' }));
      toast('success', t('notifications.sender.saved'));
    } catch (err) {
      const mapped = mapFieldIssues(err, SENDER_SERVER_FIELD);
      if (mapped) setErrors(mapped.fields);
      focusFirstInvalid(form);
      if (!mapped || mapped.unmapped.length > 0)
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
    }
  }

  async function runTest() {
    try {
      const r = await test.mutate(undefined);
      setResult(r);
      toast(
        r.ok ? 'success' : 'error',
        t(r.ok ? 'notifications.sender.testPassed' : 'notifications.sender.testFailed'),
      );
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }

  async function sendTest() {
    try {
      await testEmail.mutate(to);
      toast('success', t('notifications.sender.testEmailRecorded'));
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }

  return (
    <Card
      title={t('notifications.sender.title')}
      caption={t('notifications.sender.caption')}
      actions={
        canManage && (
          <Button icon="plug" loading={test.isPending} onClick={runTest}>
            {t('notifications.sender.test')}
          </Button>
        )
      }
    >
      <div className={layout.stack}>
        <p data-testid="sender-state">
          <Badge tone={TONE[sender.state]}>
            {t(`notifications.sender.states.${sender.state}`)}
          </Badge>{' '}
          {sender.simulated && <Badge tone="mock">{t('common.simulated')}</Badge>}{' '}
          <span className={layout.muted}>
            {sender.stateMessage}
            {sender.checkedAt && (
              <>
                {' '}
                · <bdi>{fmt.dateTime(sender.checkedAt)}</bdi>
              </>
            )}
          </span>
        </p>
        {result && (
          <ul className={layout.list} data-testid="sender-test-result">
            {result.steps.map((s) => (
              <li key={s.step}>
                <Badge
                  tone={
                    s.result === 'passed' ? 'success' : s.result === 'failed' ? 'danger' : 'neutral'
                  }
                >
                  {t(`pbxAdmin.steps.${s.result}`)}
                </Badge>{' '}
                {s.message}
              </li>
            ))}
          </ul>
        )}
        <form
          onSubmit={submit}
          noValidate
          className={layout.form}
          aria-label={t('notifications.sender.title')}
        >
          <fieldset disabled={!canManage} className={`${layout.form} ${layout.bare}`}>
            <div className={layout.row}>
              {FIELDS.map((f) => (
                <Field
                  key={f.key}
                  label={t(`notifications.sender.fields.${f.key}`)}
                  hint={t(`notifications.sender.hints.${f.key}`)}
                  required={f.required}
                  error={errors[f.key]}
                >
                  {(p) => (
                    <input
                      {...p}
                      dir={f.dir}
                      autoComplete="off"
                      spellCheck={false}
                      value={v[f.key]}
                      onChange={(e) => setV((x) => ({ ...x, [f.key]: e.target.value }))}
                    />
                  )}
                </Field>
              ))}
              <Field
                label={t('notifications.sender.fields.secret')}
                hint={t('notifications.sender.hints.secret')}
                required={!sender.credentialSet}
                error={errors.secret}
              >
                {(p) => (
                  <input
                    {...p}
                    type="password"
                    dir="ltr"
                    autoComplete="new-password"
                    placeholder={sender.credentialSet ? t('pbxAdmin.form.secretKept') : ''}
                    value={v.secret}
                    onChange={(e) => setV((x) => ({ ...x, secret: e.target.value }))}
                  />
                )}
              </Field>
            </div>
            <p className={layout.muted}>
              {sender.credentialSet ? (
                <Badge tone="success" icon="lock">
                  {t('pbxAdmin.form.credentialStored')}
                </Badge>
              ) : (
                <Badge tone="warning" icon="alert">
                  {t('pbxAdmin.form.credentialMissing')}
                </Badge>
              )}{' '}
              {t('pbxAdmin.form.secretNote')}
            </p>
          </fieldset>
          {formError && <Notice tone="danger" title={formError} />}
          {canManage && (
            <div className={layout.actions}>
              <Button variant="primary" type="submit" loading={save.isPending}>
                {t('notifications.sender.save')}
              </Button>
            </div>
          )}
        </form>
        {canManage && (
          <div className={layout.toolbar}>
            <Field
              label={t('notifications.sender.testTo')}
              hint={t('notifications.sender.testToHint')}
            >
              {(p) => (
                <input
                  {...p}
                  type="email"
                  dir="ltr"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              )}
            </Field>
            <Button
              icon="mail"
              loading={testEmail.isPending}
              disabled={!isEmail(to)}
              onClick={sendTest}
            >
              {t('notifications.sender.sendTest')}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
