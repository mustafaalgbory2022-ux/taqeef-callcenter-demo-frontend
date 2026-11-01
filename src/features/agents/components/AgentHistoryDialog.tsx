import { useI18n } from '@/shared/i18n/I18nProvider';
import type { MessageKey } from '@/shared/i18n/translate';
import type { Agent } from '@/shared/types/domain';
import { Dialog } from '@/shared/ui/Dialog';
import { EmptyState, QueryView } from '@/shared/ui/States';
import { useAgentHistory } from '../hooks/useAgentData';
import styles from './AgentHistoryDialog.module.css';

const FIELD_KEYS: Record<string, MessageKey> = {
  display_name: 'agents.fields.name',
  extension: 'agents.fields.extension',
  status: 'agents.fields.status',
  queue_ids: 'agents.fields.queues',
};

/** Change history (audit) for one agent. */
export function AgentHistoryDialog({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { t, fmt } = useI18n();
  const history = useAgentHistory(agent.id);
  return (
    <Dialog open title={t('agents.history.title', { name: agent.displayName })} onClose={onClose}>
      <QueryView query={history}>
        {(entries) =>
          entries.length === 0 ? (
            <EmptyState title={t('agents.history.empty')} />
          ) : (
            <ol className={styles.list}>
              {entries.map((entry) => (
                <li key={entry.id} className={styles.entry}>
                  <div className={styles.meta}>
                    <span className={styles.action}>
                      {t(`agents.history.actions.${entry.action}`)}
                    </span>
                    <span>
                      {entry.actor} · <bdi>{fmt.dateTime(entry.at)}</bdi>
                    </span>
                  </div>
                  <ul className={styles.changes}>
                    {entry.changes.map((c) => (
                      <li key={c.field}>
                        {FIELD_KEYS[c.field] ? t(FIELD_KEYS[c.field] as MessageKey) : c.field}:{' '}
                        {c.before !== null && (
                          <>
                            <bdi className={styles.before}>{c.before || '—'}</bdi> →{' '}
                          </>
                        )}
                        <bdi>{c.after || '—'}</bdi>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )
        }
      </QueryView>
    </Dialog>
  );
}
