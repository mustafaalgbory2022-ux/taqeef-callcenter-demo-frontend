import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useSession } from '@/shared/hooks/useSession';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Card } from '@/shared/ui/Card';
import { LinkButton } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { AppearanceSettings } from '../components/AppearanceSettings';
import { DemoDataSettings } from '../components/DemoDataSettings';
import styles from '../components/Settings.module.css';

export function SettingsPage() {
  const { t } = useI18n();
  useDocumentTitle(t('settings.page.title'), t('app.title'));
  const session = useSession();
  return (
    <>
      <PageHeader
        eyebrow={t('nav.administration')}
        title={t('settings.page.title')}
        description={t('settings.page.description')}
      />
      <div className={styles.grid}>
        <AppearanceSettings />
        <Card title={t('settings.reporting.title')} caption={t('settings.reporting.caption')}>
          <dl className={styles.list}>
            <dt>{t('settings.reporting.sampleWarnings')}</dt>
            <dd>{t('settings.reporting.sampleWarningsValue')}</dd>
            <dt>{t('settings.reporting.ranking')}</dt>
            <dd>{t('settings.reporting.rankingValue')}</dd>
            <dt>{t('settings.reporting.rounding')}</dt>
            <dd>{t('settings.reporting.roundingValue')}</dd>
          </dl>
        </Card>
        <Card title={t('settings.session.title')}>
          <dl className={styles.list}>
            <dt>{t('settings.session.user')}</dt>
            <dd>{session.displayName}</dd>
            <dt>{t('settings.session.mode')}</dt>
            <dd>{t(session.mode === 'mock' ? 'common.mockData' : 'common.liveData')}</dd>
            <dt>{t('settings.session.permissions')}</dt>
            <dd>
              <bdi>{session.permissions.join(', ')}</bdi>
            </dd>
          </dl>
        </Card>
        <DemoDataSettings />
      </div>
      <Card title={t('settings.planned.cardTitle')} caption={t('settings.planned.cardCaption')}>
        <LinkButton to="/admin/planned" icon="grid">
          {t('settings.planned.open')}
        </LinkButton>
      </Card>
    </>
  );
}
