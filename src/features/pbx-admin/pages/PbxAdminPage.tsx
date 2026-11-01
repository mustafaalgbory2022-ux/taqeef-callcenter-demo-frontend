import { useQueues } from '@/features/agents';
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
import { ConnectorForm } from '../components/ConnectorForm';
import { ConnectionStatusCard, IngestionCard, VendorsCard } from '../components/ConnectorPanels';
import { usePbxConnectors, usePbxVendors } from '../hooks/usePbxAdmin';
import { vendorAdapter } from '../vendors';

/** Yeastar P550 connector, queues 6001/6002, ingestion start date and synchronization. */
export function PbxAdminPage() {
  const { t } = useI18n();
  useDocumentTitle(t('pbxAdmin.title'), t('app.title'));
  const canManage = usePermission('pbx.manage');
  const query = combineQueries([usePbxConnectors(), usePbxVendors(), useQueues()] as const);
  const audit = useAdminAudit('pbx', 'pbx_connector');
  return (
    <>
      <PageHeader
        eyebrow={t('nav.administration')}
        title={t('pbxAdmin.title')}
        description={t('pbxAdmin.description')}
      />
      <Notice tone="mock" title={t('pbxAdmin.syntheticTitle')}>
        {t('pbxAdmin.syntheticBody')}
      </Notice>
      {!canManage && <Notice tone="info" title={t('common.readOnly')} />}
      <QueryView query={query} rows={8}>
        {([connectors, vendors, queues]) => (
          <div className={layout.stack}>
            {connectors.map((c) => {
              const adapter = vendorAdapter(c.vendor);
              const vendor = vendors.find((v) => v.id === c.vendor);
              return (
                <div key={c.id} className={layout.stack}>
                  <div className={layout.grid}>
                    <ConnectionStatusCard connector={c} />
                    <VendorsCard vendors={vendors} />
                  </div>
                  {adapter ? (
                    <ConnectorForm
                      key={c.updatedAt}
                      connector={c}
                      adapter={adapter}
                      vendorName={vendor?.name ?? c.vendor}
                      queues={queues}
                    />
                  ) : (
                    <Notice
                      tone="warning"
                      title={t('pbxAdmin.vendors.noFormTitle', {
                        vendor: vendor?.name ?? c.vendor,
                      })}
                    />
                  )}
                  <IngestionCard connector={c} />
                </div>
              );
            })}
            <Card title={t('pbxAdmin.recent')} caption={t('admin.audit.caption')}>
              <AuditTrail query={audit} limit={8} />
            </Card>
          </div>
        )}
      </QueryView>
    </>
  );
}
