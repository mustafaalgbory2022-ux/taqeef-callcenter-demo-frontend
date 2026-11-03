import { combineQueries } from '@/shared/hooks/combineQueries';
import { useAdminAudit } from '@/shared/hooks/useAdminAudit';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePermission } from '@/shared/hooks/usePermission';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { AuditTrail } from '@/shared/ui/AuditTrail';
import { LinkButton } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import { AppSettingsForm, BrandingForm } from '../components/GeneralForms';
import {
  useAppSettings,
  useAppVersions,
  useBrandingSettings,
  useBrandingVersions,
} from '../hooks/useGeneral';

/** Application-wide settings and runtime branding, versioned and validated. */
export function GeneralAdminPage() {
  const { t } = useI18n();
  useDocumentTitle(t('general.title'), t('app.title'));
  const canManage = usePermission('branding.manage');
  const query = combineQueries([
    useAppSettings(),
    useAppVersions(),
    useBrandingSettings(),
    useBrandingVersions(),
  ] as const);
  const audit = useAdminAudit('general', 'branding');
  return (
    <>
      <PageHeader
        eyebrow={t('nav.system')}
        title={t('general.title')}
        description={t('general.description')}
        actions={
          <LinkButton to="/admin/settings" icon="settings">
            {t('general.personal')}
          </LinkButton>
        }
      />
      <Notice tone="mock" title={t('general.syntheticTitle')}>
        {t('general.syntheticBody')}
      </Notice>
      {!canManage && <Notice tone="info" title={t('common.readOnly')} />}
      <QueryView query={query} rows={8}>
        {([app, appVersions, branding, brandingVersions]) => (
          <div className={layout.stack}>
            <AppSettingsForm key={`app-${app.version}`} settings={app} versions={appVersions} />
            <BrandingForm
              key={`branding-${branding.version}`}
              branding={branding}
              versions={brandingVersions}
            />
            <Card title={t('general.recent')} caption={t('admin.audit.caption')}>
              <AuditTrail query={audit} limit={6} />
            </Card>
          </div>
        )}
      </QueryView>
    </>
  );
}
