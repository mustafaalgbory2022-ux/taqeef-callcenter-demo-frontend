import type { ReactNode } from 'react';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { QueryResult } from '@/shared/hooks/useApiQuery';
import { Button } from './Button';
import { Icon } from './Icon';
import styles from './States.module.css';

export function LoadingState({ rows = 4 }: { rows?: number }) {
  const { t } = useI18n();
  return (
    <div className={styles.skeleton} role="status" aria-live="polite">
      <span className="visually-hidden">{t('common.loading')}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.bar} style={{ inlineSize: `${90 - ((i * 17) % 40)}%` }} />
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className={styles.state} role="alert">
      <Icon name="alert" size={20} />
      <p className={styles.title}>{t('common.loadFailed')}</p>
      <p>{describeError(error, t)}</p>
      {onRetry && (
        <Button size="sm" icon="refresh" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={styles.state}>
      <p className={styles.title}>{title}</p>
      {children}
    </div>
  );
}

/** Standard loading / error / success rendering for a query. */
export function QueryView<T>({
  query,
  rows,
  children,
}: {
  query: QueryResult<T>;
  rows?: number;
  children: (data: T) => ReactNode;
}) {
  if (query.status === 'success') return <>{children(query.data)}</>;
  if (query.status === 'error') {
    if (query.data !== undefined) return <>{children(query.data)}</>;
    return <ErrorState error={query.error} onRetry={query.refetch} />;
  }
  return <LoadingState rows={rows ?? 4} />;
}
