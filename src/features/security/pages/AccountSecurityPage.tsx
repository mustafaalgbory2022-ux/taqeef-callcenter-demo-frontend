import { useState, type FormEvent } from 'react';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type {
  AccountMfa,
  MfaEnrollment,
  RecoveryCodesResult,
  SecurityPolicy,
} from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Field } from '@/shared/ui/Field';
import { Icon } from '@/shared/ui/Icon';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import { useToast } from '@/shared/ui/Toaster';
import {
  useChangePassword,
  useMyMfa,
  usePolicy,
  useRecoveryCodes,
  useStartEnrollment,
  useVerifyEnrollment,
} from '../hooks/useSecurity';
import { isTotpCode, passwordChecklist } from '../model/security';

/** The signed-in user's own MFA enrollment, recovery codes and password. */
export function AccountSecurityPage() {
  const { t } = useI18n();
  useDocumentTitle(t('account.title'), t('app.title'));
  const mfa = useMyMfa();
  const policy = usePolicy();
  return (
    <>
      <PageHeader
        eyebrow={t('nav.system')}
        title={t('account.title')}
        description={t('account.description')}
      />
      <Notice tone="mock" title={t('account.syntheticTitle')}>
        {t('account.syntheticBody')}
      </Notice>
      <div className={layout.stack}>
        <QueryView query={mfa}>{(m) => <MfaCard mfa={m} />}</QueryView>
        <QueryView query={policy}>{(p) => <PasswordCard policy={p} />}</QueryView>
      </div>
    </>
  );
}

function MfaCard({ mfa }: { mfa: AccountMfa }) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const start = useStartEnrollment();
  const verify = useVerifyEnrollment();
  const recovery = useRecoveryCodes();
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [codes, setCodes] = useState<RecoveryCodesResult | null>(null);

  async function begin() {
    try {
      setEnrollment(await start.mutate(undefined));
      setCode('');
      setError(null);
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!enrollment) return;
    if (!isTotpCode(code)) {
      setError(t('account.mfa.codeFormat'));
      return;
    }
    try {
      await verify.mutate({ id: enrollment.enrollmentId, code });
      setEnrollment(null);
      toast('success', t('account.mfa.enrolledToast'));
    } catch (err) {
      const mapped = mapFieldIssues(err, { code: 'code' });
      setError(mapped?.fields.code ?? describeError(err, t));
    }
  }

  return (
    <Card title={t('account.mfa.title')} caption={t('account.mfa.caption')}>
      <div className={layout.stack} data-testid="mfa-card">
        <p>
          <Badge tone={mfa.state === 'enrolled' ? 'success' : 'warning'}>
            {t(`users.mfa.${mfa.state}`)}
          </Badge>{' '}
          {mfa.enrolledAt && (
            <span className={layout.muted}>
              {t('account.mfa.since', { at: fmt.dateTime(mfa.enrolledAt) })}
            </span>
          )}
        </p>
        {mfa.state !== 'enrolled' && !enrollment && (
          <>
            <Notice tone="warning" title={t('account.mfa.required')} />
            <div className={layout.actions}>
              <Button variant="primary" icon="lock" loading={start.isPending} onClick={begin}>
                {t('account.mfa.start')}
              </Button>
            </div>
          </>
        )}
        {enrollment && (
          <form
            onSubmit={submit}
            noValidate
            className={layout.form}
            aria-label={t('account.mfa.wizard')}
          >
            <ol className={layout.list}>
              <li>{t('account.mfa.step1')}</li>
              <li>
                {t('account.mfa.step2', {
                  issuer: enrollment.issuer,
                  account: enrollment.accountLabel,
                })}
              </li>
              <li>{t('account.mfa.step3')}</li>
            </ol>
            <div
              className={layout.preview}
              role="img"
              aria-label={t('account.mfa.qrPlaceholder')}
              data-testid="qr-placeholder"
            >
              <Icon name="lock" />{' '}
              {enrollment.secretAvailable
                ? t('account.mfa.qrFromBackend')
                : t('account.mfa.qrPlaceholder')}
            </div>
            <Field
              label={t('account.mfa.code')}
              hint={t('account.mfa.codeHint')}
              required
              error={error ?? undefined}
            >
              {(p) => (
                <input
                  {...p}
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
              )}
            </Field>
            <p className={layout.muted}>
              {t('account.mfa.expires', { at: fmt.dateTime(enrollment.expiresAt) })}
            </p>
            <div className={layout.actions}>
              <Button variant="primary" type="submit" loading={verify.isPending}>
                {t('account.mfa.verify')}
              </Button>
              <Button type="button" onClick={() => setEnrollment(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        )}
        {mfa.state === 'enrolled' && (
          <div className={layout.stack}>
            <h3>{t('account.recovery.title')}</h3>
            <p className={layout.muted}>
              {mfa.recoveryCodesRemaining === null
                ? t('account.recovery.unknown')
                : t('account.recovery.remaining', { n: mfa.recoveryCodesRemaining })}
            </p>
            <div className={layout.actions}>
              <Button onClick={() => setConfirmRegen(true)}>
                {t('account.recovery.generate')}
              </Button>
            </div>
            {codes && (
              <Notice
                tone={codes.generated ? 'info' : 'mock'}
                title={t(codes.generated ? 'account.recovery.shownOnce' : 'account.recovery.none')}
                testId="recovery-result"
              >
                {codes.message}
              </Notice>
            )}
          </div>
        )}
      </div>
      {confirmRegen && (
        <ConfirmDialog
          title={t('account.recovery.confirmTitle')}
          confirmLabel={t('account.recovery.generate')}
          acknowledge={t('account.recovery.ack')}
          onClose={() => setConfirmRegen(false)}
          onConfirm={async () => {
            setCodes(await recovery.mutate(undefined));
            setConfirmRegen(false);
          }}
        >
          <p>{t('account.recovery.confirmBody')}</p>
        </ConfirmDialog>
      )}
    </Card>
  );
}

function PasswordCard({ policy }: { policy: SecurityPolicy }) {
  const { t } = useI18n();
  const toast = useToast();
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'current' | 'next' | 'repeat', string>>>({});
  const [result, setResult] = useState<string | null>(null);
  // The server also rejects passwords containing the username.
  const checklist = passwordChecklist(next, policy, '');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const client: typeof errors = {};
    if (!current) client.current = t('account.password.currentRequired');
    if (checklist.some((c) => !c.ok)) client.next = t('account.password.policy');
    if (next !== repeat) client.repeat = t('account.password.mismatch');
    setErrors(client);
    if (Object.keys(client).length > 0) return;
    try {
      const r = await change.mutate({ current, next });
      setResult(r.message);
      setCurrent('');
      setNext('');
      setRepeat('');
      toast('success', t('account.password.changed'));
    } catch (err) {
      const mapped = mapFieldIssues(err, {
        current_password: 'current',
        new_password: 'next',
      } as const);
      if (mapped) setErrors(mapped.fields);
      else toast('error', describeError(err, t));
    }
  }

  return (
    <Card title={t('account.password.title')} caption={t('account.password.caption')}>
      <form
        onSubmit={submit}
        noValidate
        className={layout.form}
        aria-label={t('account.password.title')}
      >
        <div className={layout.row}>
          <Field label={t('account.password.current')} required error={errors.current}>
            {(p) => (
              <input
                {...p}
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            )}
          </Field>
          <Field label={t('account.password.next')} required error={errors.next}>
            {(p) => (
              <input
                {...p}
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            )}
          </Field>
          <Field label={t('account.password.repeat')} required error={errors.repeat}>
            {(p) => (
              <input
                {...p}
                type="password"
                autoComplete="new-password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
              />
            )}
          </Field>
        </div>
        <ul
          className={layout.list}
          aria-label={t('account.password.rules')}
          data-testid="password-checklist"
        >
          {checklist.map((c) => (
            <li key={c.issue}>
              <Icon
                name={c.ok ? 'check' : 'minus'}
                label={t(c.ok ? 'users.matrix.yes' : 'users.matrix.no')}
              />{' '}
              {t(`account.password.checks.${c.issue}`, { n: policy.minPasswordLength })}
            </li>
          ))}
        </ul>
        {result && <Notice tone="mock" title={result} />}
        <div className={layout.actions}>
          <Button variant="primary" type="submit" loading={change.isPending}>
            {t('account.password.submit')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
