import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePermission } from '@/shared/hooks/usePermission';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import {
  AuthModeCard,
  LockoutsCard,
  PolicyForm,
  RecoveryWorkflowCard,
  SecurityEventsCard,
  SessionsCard,
} from '../components/SecurityPanels';
import { usePolicy } from '../hooks/useSecurity';

/** Production authentication administration: policy, sessions, lockouts, events, recovery. */
export function SecurityAdminPage() {
  const { t } = useI18n();
  useDocumentTitle(t('security.title'), t('app.title'));
  const canManage = usePermission('security.manage');
  const policy = usePolicy();
  return (
    <>
      <PageHeader
        eyebrow={t('nav.system')}
        title={t('security.title')}
        description={t('security.description')}
      />
      <Notice tone="mock" title={t('security.syntheticTitle')}>
        {t('security.syntheticBody')}
      </Notice>
      {!canManage && <Notice tone="info" title={t('common.readOnly')} />}
      <div className={layout.stack}>
        <AuthModeCard />
        <QueryView query={policy}>
          {(p) => <PolicyForm key={`policy-${p.version}`} policy={p} />}
        </QueryView>
        <SessionsCard />
        <div className={layout.grid}>
          <LockoutsCard />
          <SecurityEventsCard />
        </div>
        <RecoveryWorkflowCard />
      </div>
    </>
  );
}
