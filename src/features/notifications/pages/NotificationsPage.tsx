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
import { DeliveriesCard } from '../components/DeliveriesCard';
import { ReportEmailCard } from '../components/ReportEmailCard';
import { RulesCard } from '../components/RulesCard';
import { SenderCard } from '../components/SenderCard';
import { TemplatesCard } from '../components/TemplatesCard';
import { useReportEmail, useRules, useSender, useTemplates } from '../hooks/useNotifications';

/** Microsoft 365 sender, low-quality notifications, report email options, templates, deliveries. */
export function NotificationsPage() {
  const { t } = useI18n();
  useDocumentTitle(t('notifications.title'), t('app.title'));
  const canManage = usePermission('notifications.manage');
  const query = combineQueries([
    useSender(),
    useRules(),
    useTemplates(),
    useReportEmail(),
    useQueues(),
  ] as const);
  const senderAudit = useAdminAudit('notifications', 'email_sender');
  const ruleAudit = useAdminAudit('notifications', 'notification_rule');
  return (
    <>
      <PageHeader
        eyebrow={t('nav.administration')}
        title={t('notifications.title')}
        description={t('notifications.description')}
      />
      <Notice tone="mock" title={t('notifications.syntheticTitle')}>
        {t('notifications.syntheticBody')}
      </Notice>
      {!canManage && <Notice tone="info" title={t('common.readOnly')} />}
      <QueryView query={query} rows={8}>
        {([sender, rules, templates, reportEmail, queues]) => (
          <div className={layout.stack}>
            <SenderCard key={`sender-${sender.updatedAt}`} sender={sender} />
            <RulesCard rules={rules} templates={templates} queues={queues} />
            <ReportEmailCard
              key={reportEmail.updatedAt}
              options={reportEmail}
              templates={templates}
            />
            <TemplatesCard templates={templates} />
            <DeliveriesCard />
            <div className={layout.grid}>
              <Card title={t('notifications.audit.sender')} caption={t('admin.audit.caption')}>
                <AuditTrail query={senderAudit} limit={5} />
              </Card>
              <Card title={t('notifications.audit.rules')} caption={t('admin.audit.caption')}>
                <AuditTrail query={ruleAudit} limit={5} />
              </Card>
            </div>
          </div>
        )}
      </QueryView>
    </>
  );
}
