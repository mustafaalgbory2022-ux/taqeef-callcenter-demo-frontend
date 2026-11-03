import { useState } from 'react';
import { combineQueries } from '@/shared/hooks/combineQueries';
import { useAdminAudit } from '@/shared/hooks/useAdminAudit';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePermission } from '@/shared/hooks/usePermission';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { BackupRun } from '@/shared/types/domain';
import { AuditTrail } from '@/shared/ui/AuditTrail';
import { Card } from '@/shared/ui/Card';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import {
  BackupHistoryCard,
  BackupSettingsForm,
  MigrationCard,
  RestoreHistoryCard,
} from '../components/BackupPanels';
import { RestoreWizard } from '../components/RestoreWizard';
import { useBackupRuns, useBackupSettings, useMigration, useRestores } from '../hooks/useBackups';

/** Backup configuration, manual backups, verification, restore wizard and migration readiness. */
export function BackupsAdminPage() {
  const { t } = useI18n();
  useDocumentTitle(t('backups.title'), t('app.title'));
  const canManage = usePermission('backups.manage');
  const query = combineQueries([
    useBackupSettings(),
    useBackupRuns(),
    useRestores(),
    useMigration(),
    useApiQuery(['backups', 'volumes'], (api) => api.storage.overview()),
  ] as const);
  const audit = useAdminAudit('backups', 'backup');
  const [restoring, setRestoring] = useState<BackupRun | null>(null);
  return (
    <>
      <PageHeader
        eyebrow={t('nav.system')}
        title={t('backups.title')}
        description={t('backups.description')}
      />
      <Notice tone="mock" title={t('backups.syntheticTitle')}>
        {t('backups.syntheticBody')}
      </Notice>
      {!canManage && <Notice tone="info" title={t('common.readOnly')} />}
      <QueryView query={query} rows={8}>
        {([settings, runs, restores, readiness, overview]) => (
          <div className={layout.stack}>
            <BackupHistoryCard runs={runs} onRestore={setRestoring} />
            <div className={layout.grid}>
              <BackupSettingsForm
                key={`backup-${settings.version}`}
                settings={settings}
                volumes={overview.volumes}
              />
              <MigrationCard readiness={readiness} />
            </div>
            <RestoreHistoryCard restores={restores} />
            <Card title={t('backups.recent')} caption={t('admin.audit.caption')}>
              <AuditTrail query={audit} limit={6} />
            </Card>
          </div>
        )}
      </QueryView>
      {restoring && <RestoreWizard run={restoring} onClose={() => setRestoring(null)} />}
    </>
  );
}
