import { combineQueries } from '@/shared/hooks/combineQueries';
import { useAdminAudit } from '@/shared/hooks/useAdminAudit';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePermission } from '@/shared/hooks/usePermission';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { AuditTrail } from '@/shared/ui/AuditTrail';
import { Card } from '@/shared/ui/Card';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import { OverviewCard, RecoveryCard, StorageSettingsForm } from '../components/StoragePanels';
import { useRecovery, useStorageOverview, useStorageSettings } from '../hooks/useStorage';

/** Storage usage, locations, retention and the audited recovery area. */
export function StorageAdminPage() {
  const { t } = useI18n();
  useDocumentTitle(t('storage.title'), t('app.title'));
  const canManage = usePermission('storage.manage');
  const query = combineQueries([
    useStorageOverview(),
    useStorageSettings(),
    useRecovery(),
  ] as const);
  const audit = useAdminAudit('storage', 'storage_item');
  return (
    <>
      <PageHeader
        eyebrow={t('nav.system')}
        title={t('storage.title')}
        description={t('storage.description')}
      />
      <Notice tone="mock" title={t('storage.syntheticTitle')}>
        {t('storage.syntheticBody')}
      </Notice>
      {!canManage && <Notice tone="info" title={t('common.readOnly')} />}
      <QueryView query={query} rows={8}>
        {([overview, settings, recovery]) => (
          <div className={layout.stack}>
            <OverviewCard overview={overview} />
            <StorageSettingsForm
              key={`storage-${settings.version}`}
              settings={settings}
              overview={overview}
            />
            <RecoveryCard items={recovery} />
            <Card title={t('storage.recent')} caption={t('admin.audit.caption')}>
              <AuditTrail query={audit} limit={6} />
            </Card>
          </div>
        )}
      </QueryView>
    </>
  );
}
