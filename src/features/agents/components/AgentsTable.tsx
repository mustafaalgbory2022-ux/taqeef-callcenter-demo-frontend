import { Link } from 'react-router';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Agent } from '@/shared/types/domain';
import { Badge, SyntheticBadge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { tableStyles, TableRegion } from '@/shared/ui/Table';

export interface AgentsTableProps {
  agents: readonly Agent[];
  canManage: boolean;
  onRetire: (agent: Agent) => void;
  onHistory: (agent: Agent) => void;
}

export function AgentsTable({ agents, canManage, onRetire, onHistory }: AgentsTableProps) {
  const { t, fmt } = useI18n();
  return (
    <TableRegion label={t('agents.table.label')}>
      <thead>
        <tr>
          <th scope="col">{t('agents.fields.name')}</th>
          <th scope="col">{t('agents.fields.extension')}</th>
          <th scope="col">{t('agents.fields.status')}</th>
          <th scope="col">{t('agents.table.updated')}</th>
          <th scope="col">
            <span className="visually-hidden">{t('common.actions')}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {agents.map((agent) => (
          <tr key={agent.id}>
            <td>
              <Link to={`/agents/${encodeURIComponent(agent.id)}`}>{agent.displayName}</Link>{' '}
              {agent.synthetic && <SyntheticBadge />}
            </td>
            <td className={tableStyles.mono}>
              <bdi>{agent.extension ?? '—'}</bdi>
            </td>
            <td>
              <Badge
                tone={agent.status === 'active' ? 'success' : 'neutral'}
                icon={agent.status === 'active' ? 'check' : 'minus'}
              >
                {t(`agents.status.${agent.status}`)}
              </Badge>
            </td>
            <td className={tableStyles.muted}>
              <bdi>{fmt.date(agent.updatedAt)}</bdi>
            </td>
            <td>
              <Button variant="ghost" size="sm" icon="history" onClick={() => onHistory(agent)}>
                {t('agents.history.open')}
                <span className="visually-hidden"> — {agent.displayName}</span>
              </Button>
              {canManage && (
                <>
                  {agent.status === 'active' && (
                    <Button variant="ghost" size="sm" onClick={() => onRetire(agent)}>
                      {t('agents.status.retire')}
                      <span className="visually-hidden"> — {agent.displayName}</span>
                    </Button>
                  )}
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </TableRegion>
  );
}
