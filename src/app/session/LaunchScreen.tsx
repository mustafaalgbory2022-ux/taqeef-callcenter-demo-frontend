import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useApiClient } from '@/shared/api/ApiProvider';
import { ApiError } from '@/shared/api/errors';
import { runtime } from '@/shared/api/runtime';
import { useBranding } from '@/shared/branding/BrandingProvider';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Button } from '@/shared/ui/Button';
import { DataSourceBadge } from '@/shared/ui/DataSourceBadge';
import { Field } from '@/shared/ui/Field';
import { Notice } from '@/shared/ui/Notice';
import { PreferenceControls } from '../shell/PreferenceControls';
import styles from './LaunchScreen.module.css';

export interface LaunchScreenProps {
  initialCode: string | null;
  loadError: unknown;
  /** The backend ended the previous session (401): it can only be reopened from the launcher. */
  sessionEnded?: boolean;
  onOpened: () => void;
}

export function LaunchScreen({
  initialCode,
  loadError,
  sessionEnded = false,
  onOpened,
}: LaunchScreenProps) {
  const { t, pick } = useI18n();
  const api = useApiClient();
  const branding = useBranding();
  const [code, setCode] = useState(initialCode ?? runtime.demoTools?.issueLaunchCode() ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSubmitted = useRef(false);

  async function open(value: string) {
    setPending(true);
    setError(null);
    try {
      await api.openSession(value);
      onOpened();
    } catch (err) {
      const rejected =
        err instanceof ApiError &&
        (err.code === 'unauthorized' || err.code === 'validation_error' || err.status === 400);
      setError(rejected ? t('session.codeRejected') : describeError(err, t));
      setPending(false);
    }
  }

  // A code delivered in the launch URL is exchanged automatically, exactly once.
  useEffect(() => {
    if (initialCode && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void open(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (code.trim()) void open(code);
  }

  return (
    <main className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.toolbar}>
          <DataSourceBadge mode={api.mode} />
          <PreferenceControls compact />
        </div>
        <div className={styles.brand}>
          <img className={styles.logo} src={branding.logoUrl} alt="" width={36} height={36} />
          <div>
            <p className={styles.org}>{pick(branding.organizationName)}</p>
            <h1 className={styles.title}>{pick(branding.productName)}</h1>
          </div>
        </div>
        {sessionEnded && (
          <Notice tone="warning" title={t('session.ended')} testId="session-ended" />
        )}
        <p className={styles.body}>{t('session.body')}</p>
        <form className={styles.form} onSubmit={submit}>
          <Field
            label={t('session.codeLabel')}
            hint={api.mode === 'mock' ? t('session.mockHint') : t('session.liveHint')}
          >
            {(p) => (
              <input
                {...p}
                value={code}
                dir="ltr"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setCode(e.target.value)}
              />
            )}
          </Field>
          {(error || loadError !== undefined) && (
            <Notice tone="danger" title={error ?? describeError(loadError, t)} />
          )}
          <Button variant="primary" type="submit" loading={pending} disabled={!code.trim()}>
            {t('session.open')}
          </Button>
        </form>
      </div>
    </main>
  );
}
