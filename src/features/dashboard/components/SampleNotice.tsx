import { useI18n } from '@/shared/i18n/I18nProvider';
import { Notice } from '@/shared/ui/Notice';

/**
 * Always shown: no reporting policy has been approved for when agent results become
 * reliable, so results are presented as a synthetic sample, never as a ranking.
 */
export function SampleNotice({ evaluatedCalls }: { evaluatedCalls: number }) {
  const { t, fmt } = useI18n();
  return (
    <Notice
      tone="mock"
      title={t('dashboard.sample.title', { n: fmt.integer(evaluatedCalls) })}
      testId="sample-notice"
    >
      {t('dashboard.sample.body')}
    </Notice>
  );
}

export function VersionNotice({ versions }: { versions: readonly number[] }) {
  const { t } = useI18n();
  if (versions.length < 2) return null;
  return (
    <Notice
      tone="info"
      title={t('dashboard.versions.title', { versions: versions.map((v) => `v${v}`).join(', ') })}
    >
      {t('dashboard.versions.body')}
    </Notice>
  );
}
