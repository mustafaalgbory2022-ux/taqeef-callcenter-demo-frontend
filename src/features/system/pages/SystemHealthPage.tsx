import { JobQueuePanel, useAiConfig } from '@/features/ai-admin';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePermission } from '@/shared/hooks/usePermission';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Badge } from '@/shared/ui/Badge';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import {
  ErrorsCard,
  IntegrationsCard,
  ResourcesCard,
  ServicesCard,
  WorkersCard,
} from '../components/HealthPanels';
import { useHealth } from '../hooks/useSystem';
import { HEALTH_TONE } from '../model/system';

/** Services, resources, workers, processing queue, integrations and the admin error log. */
export function SystemHealthPage() {
  const { t } = useI18n();
  useDocumentTitle(t('system.title'), t('app.title'));
  const canView = usePermission('system.view');
  const health = useHealth();
  const config = useAiConfig();
  if (!canView) {
    return (
      <>
        <PageHeader eyebrow={t('nav.system')} title={t('system.title')} />
        <Notice tone="warning" title={t('errors.forbidden')} />
      </>
    );
  }
  return (
    <>
      <PageHeader
        eyebrow={t('nav.system')}
        title={t('system.title')}
        description={t('system.description')}
        actions={
          health.data && (
            <Badge tone={HEALTH_TONE[health.data.overall]}>
              {t('system.overall', { state: t(`system.health.${health.data.overall}`) })}
            </Badge>
          )
        }
      />
      <Notice tone="mock" title={t('system.syntheticTitle')}>
        {t('system.syntheticBody')}
      </Notice>
      <QueryView query={health} rows={8}>
        {(h) => (
          <div className={layout.stack}>
            <ServicesCard health={h} />
            <div className={layout.grid}>
              <ResourcesCard health={h} />
              <div className={layout.stack}>
                <WorkersCard health={h} />
                <IntegrationsCard health={h} />
              </div>
            </div>
            <JobQueuePanel retryLimit={config.data?.limits.retryLimit ?? 0} />
            <ErrorsCard />
          </div>
        )}
      </QueryView>
    </>
  );
}
