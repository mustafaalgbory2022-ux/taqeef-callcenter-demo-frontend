import { sortAgents, useAgents, useQueues } from '@/features/agents';
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
import { ReportSettingsForm, SchedulingCard } from '../components/ReportSettingsForm';
import { WeeklyReportGenerator } from '../components/WeeklyReportGenerator';
import { useReportSettings } from '../hooks/useReports';

/** Report configuration: manual weekly generation, sampling policy, scope and delivery. */
export function ReportSettingsPage() {
  const { t } = useI18n();
  useDocumentTitle(t('reportSettings.title'), t('app.title'));
  const canManage = usePermission('reports.manage');
  const query = combineQueries([useReportSettings(), useAgents(), useQueues()] as const);
  const settingsAudit = useAdminAudit('reports', 'report_settings');
  const runAudit = useAdminAudit('reports', 'report_run');
  return (
    <>
      <PageHeader
        eyebrow={t('nav.administration')}
        title={t('reportSettings.title')}
        description={t('reportSettings.description')}
      />
      <Notice tone="mock" title={t('reportSettings.syntheticTitle')}>
        {t('reportSettings.syntheticBody')}
      </Notice>
      {!canManage && <Notice tone="info" title={t('common.readOnly')} />}
      <QueryView query={query} rows={8}>
        {([settings, agents, queues]) => (
          <div className={layout.stack}>
            <WeeklyReportGenerator
              key={`run-${settings.version}`}
              settings={settings}
              agents={sortAgents(agents)}
              queues={queues}
            />
            <div className={layout.grid}>
              <ReportSettingsForm
                key={`settings-${settings.version}`}
                settings={settings}
                agents={sortAgents(agents)}
                queues={queues}
              />
              <SchedulingCard settings={settings} />
            </div>
            <div className={layout.grid}>
              <Card title={t('reportSettings.audit.runs')} caption={t('admin.audit.caption')}>
                <AuditTrail query={runAudit} limit={5} />
              </Card>
              <Card title={t('reportSettings.audit.settings')} caption={t('admin.audit.caption')}>
                <AuditTrail query={settingsAudit} limit={5} />
              </Card>
            </div>
          </div>
        )}
      </QueryView>
    </>
  );
}
