import { useState } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePermission } from '@/shared/hooks/usePermission';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Agent } from '@/shared/types/domain';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import { AgentFormDialog } from '../components/AgentFormDialog';
import { AgentHistoryDialog } from '../components/AgentHistoryDialog';
import { AgentsTable } from '../components/AgentsTable';
import { ConfirmStatusDialog } from '../components/ConfirmStatusDialog';
import { useAgents } from '../hooks/useAgentData';
import { sortAgents } from '../model/agents';

type DialogState =
  | { kind: 'none' }
  | { kind: 'form'; agent: Agent | null }
  | { kind: 'status'; agent: Agent }
  | { kind: 'history'; agent: Agent };

export function AgentsAdminPage() {
  const { t } = useI18n();
  useDocumentTitle(t('agents.admin.title'), t('app.title'));
  const canManage = usePermission('agents.manage');
  const agents = useAgents();
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const close = () => setDialog({ kind: 'none' });
  const list = agents.status === 'success' ? agents.data : [];

  return (
    <>
      <PageHeader
        eyebrow={t('nav.administration')}
        title={t('agents.admin.title')}
        description={t('agents.admin.description')}
        actions={
          canManage && (
            <Button
              variant="primary"
              icon="plus"
              onClick={() => setDialog({ kind: 'form', agent: null })}
            >
              {t('agents.admin.add')}
            </Button>
          )
        }
      />
      <Notice tone="mock" title={t('agents.admin.syntheticTitle')}>
        {t('agents.admin.syntheticBody')}
      </Notice>
      <Card
        title={t('agents.admin.listTitle')}
        caption={t('agents.admin.listCaption', {
          count: list.length,
          active: list.filter((a) => a.status === 'active').length,
        })}
        flush
      >
        <QueryView query={agents}>
          {(data) => (
            <AgentsTable
              agents={sortAgents(data)}
              canManage={canManage}
              onEdit={(agent) => setDialog({ kind: 'form', agent })}
              onToggleStatus={(agent) => setDialog({ kind: 'status', agent })}
              onHistory={(agent) => setDialog({ kind: 'history', agent })}
            />
          )}
        </QueryView>
      </Card>

      {dialog.kind === 'form' && (
        <AgentFormDialog agent={dialog.agent} agents={list} onClose={close} />
      )}
      {dialog.kind === 'status' && <ConfirmStatusDialog agent={dialog.agent} onClose={close} />}
      {dialog.kind === 'history' && <AgentHistoryDialog agent={dialog.agent} onClose={close} />}
    </>
  );
}
