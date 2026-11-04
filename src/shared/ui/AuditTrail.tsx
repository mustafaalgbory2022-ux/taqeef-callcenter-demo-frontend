import { useI18n } from '@/shared/i18n/I18nProvider';
import type { QueryResult } from '@/shared/hooks/useApiQuery';
import type { AdminAuditEntry } from '@/shared/types/domain';
import { Badge } from './Badge';
import { ChangeArrow } from './ChangeArrow';
import { EmptyState, QueryView } from './States';
import styles from './AuditTrail.module.css';

/**
 * Read-only, append-only change history (who, what, when, before → after). The list is
 * rendered exactly as served; nothing here can edit or remove an entry.
 */
export function AuditTrail({
  query,
  limit,
}: {
  query: QueryResult<AdminAuditEntry[]>;
  limit?: number;
}) {
  const { t, fmt } = useI18n();
  return (
    <QueryView query={query} rows={3}>
      {(all) => {
        const entries = limit ? all.slice(0, limit) : all;
        if (entries.length === 0) return <EmptyState title={t('admin.audit.empty')} />;
        return (
          <ol className={styles.list} aria-label={t('admin.audit.label')}>
            {entries.map((entry) => (
              <li key={entry.id} className={styles.entry}>
                <div className={styles.meta}>
                  <span className={styles.action}>
                    <span>{t(`admin.audit.actions.${entry.action}`)}</span>{' '}
                    {entry.simulated && <Badge tone="mock">{t('common.simulated')}</Badge>}
                  </span>
                  <span>
                    {entry.actor} · <bdi>{fmt.dateTime(entry.at)}</bdi>
                  </span>
                </div>
                <p className={styles.summary}>
                  <bdi>{entry.summary}</bdi>
                </p>
                {entry.changes.length > 0 && (
                  <ul className={styles.changes}>
                    {entry.changes.map((c) => (
                      <li key={c.field}>
                        <bdi className={styles.field}>{c.field}</bdi>:{' '}
                        {c.before !== null && (
                          <>
                            <bdi className={styles.before}>{c.before || '—'}</bdi>
                            <ChangeArrow />
                          </>
                        )}
                        <bdi>{c.after ?? '—'}</bdi>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        );
      }}
    </QueryView>
  );
}
