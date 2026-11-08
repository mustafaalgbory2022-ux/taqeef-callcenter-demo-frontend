import { Link } from 'react-router';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Agent } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { tableStyles, TableRegion } from '@/shared/ui/Table';

export interface AgentsTableProps {
  agents: readonly Agent[];
  canManage: boolean;
  onRetire: (agent: Agent) => void;
}

/**
 * Agents (contract v0.3 §4): masked names, created and retired dates, and Retire for active
 * agents. No rename, reactivate, delete or history action exists.
 */
export function AgentsTable({ agents, canManage, onRetire }: AgentsTableProps) {
  const { t, fmt } = useI18n();
  return (
    <TableRegion label={t('agents.table.label')}>
      <thead>
        <tr>
          <th scope="col">{t('agents.fields.name')}</th>
          <th scope="col">{t('agents.fields.status')}</th>
          <th scope="col">{t('agents.table.created')}</th>
          <th scope="col">{t('agents.table.retired')}</th>
          <th scope="col">
            <span className="visually-hidden">{t('common.actions')}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {agents.map((agent) => (
          <tr key={agent.id} data-status={agent.status}>
            <td>
              <Link to={`/agents/${encodeURIComponent(agent.id)}`}>{agent.displayName}</Link>
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
              <bdi>{fmt.date(agent.createdAt)}</bdi>
            </td>
            <td className={tableStyles.muted}>
              <bdi>{agent.retiredAt ? fmt.date(agent.retiredAt) : '—'}</bdi>
            </td>
            <td>
              {canManage && agent.status === 'active' && (
                <Button variant="ghost" size="sm" onClick={() => onRetire(agent)}>
                  {t('agents.status.retire')}
                  <span className="visually-hidden"> — {agent.displayName}</span>
                </Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </TableRegion>
  );
}
