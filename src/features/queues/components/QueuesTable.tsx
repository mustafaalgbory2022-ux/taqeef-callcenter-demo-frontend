import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Agent, Queue } from '@/shared/types/domain';
import { Badge, SyntheticBadge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { assignedAgents, isActive } from '../model/queues';

export interface QueuesTableProps {
  queues: readonly Queue[];
  agents: readonly Agent[];
  canManage: boolean;
  onEdit: (q: Queue) => void;
  onAgents: (q: Queue) => void;
  onToggle: (q: Queue) => void;
  onHistory: (q: Queue) => void;
}

export function QueuesTable({
  queues,
  agents,
  canManage,
  onEdit,
  onAgents,
  onToggle,
  onHistory,
}: QueuesTableProps) {
  const { t, pick, fmt } = useI18n();
  return (
    <TableRegion label={t('queueAdmin.table.label')}>
      <thead>
        <tr>
          <th scope="col">{t('queueAdmin.fields.number')}</th>
          <th scope="col">{t('queueAdmin.fields.name')}</th>
          <th scope="col">{t('agents.fields.status')}</th>
          <th scope="col">{t('queueAdmin.table.agents')}</th>
          <th scope="col">{t('agents.table.updated')}</th>
          <th scope="col">
            <span className="visually-hidden">{t('common.actions')}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {queues.map((q) => {
          const assigned = assignedAgents(q.id, agents);
          const active = isActive(q);
          const label = `${q.number} ${pick(q.name)}`;
          return (
            <tr key={q.id}>
              <td className={tableStyles.mono}>
                <bdi>{q.number}</bdi>
              </td>
              <td className={tableStyles.wrap}>
                {pick(q.name)} {q.synthetic && <SyntheticBadge />}
                {q.description && <div className={tableStyles.muted}>{q.description}</div>}
              </td>
              <td>
                <Badge tone={active ? 'success' : 'neutral'} icon={active ? 'check' : 'minus'}>
                  {t(active ? 'queueAdmin.status.active' : 'queueAdmin.status.disabled')}
                </Badge>
              </td>
              <td className={tableStyles.wrap}>
                <bdi>{assigned.length}</bdi>
                {assigned.length > 0 && (
                  <span className={tableStyles.muted}>
                    {' '}
                    · {assigned.map((a) => a.displayName).join(', ')}
                  </span>
                )}
              </td>
              <td className={tableStyles.muted}>
                <bdi>{q.updatedAt ? fmt.date(q.updatedAt) : '—'}</bdi>
              </td>
              <td>
                <Button variant="ghost" size="sm" icon="history" onClick={() => onHistory(q)}>
                  {t('agents.history.open')}
                  <span className="visually-hidden"> — {label}</span>
                </Button>
                {canManage && (
                  <>
                    <Button variant="ghost" size="sm" icon="edit" onClick={() => onEdit(q)}>
                      {t('common.edit')}
                      <span className="visually-hidden"> — {label}</span>
                    </Button>
                    <Button variant="ghost" size="sm" icon="users" onClick={() => onAgents(q)}>
                      {t('queueAdmin.agents.open')}
                      <span className="visually-hidden"> — {label}</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onToggle(q)}>
                      {t(active ? 'queueAdmin.status.disable' : 'queueAdmin.status.enable')}
                      <span className="visually-hidden"> — {label}</span>
                    </Button>
                  </>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </TableRegion>
  );
}
