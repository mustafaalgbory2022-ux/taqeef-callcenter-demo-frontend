import { AgentFilter, useAgentParam } from '@/features/agents';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePermission } from '@/shared/hooks/usePermission';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { LinkButton } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { CallsCard } from '../components/CallsCard';

export function CallsPage() {
  const { t } = useI18n();
  useDocumentTitle(t('calls.page.title'), t('app.title'));
  const [agentId] = useAgentParam();
  const canUpload = usePermission('calls.upload');
  return (
    <>
      <PageHeader
        eyebrow={t('nav.performance')}
        title={t('calls.page.title')}
        description={t('calls.page.description')}
        actions={
          <>
            <AgentFilter />
            {canUpload && (
              <LinkButton variant="primary" icon="upload" to="/calls/upload">
                {t('calls.upload.open')}
              </LinkButton>
            )}
          </>
        }
      />
      <CallsCard agentId={agentId} />
    </>
  );
}
