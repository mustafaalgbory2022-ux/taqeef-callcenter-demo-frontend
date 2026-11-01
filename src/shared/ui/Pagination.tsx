import { useI18n } from '@/shared/i18n/I18nProvider';
import { Button } from './Button';
import styles from './Pagination.module.css';

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const { t, fmt } = useI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return (
    <nav className={styles.pager} aria-label={t('pagination.label')}>
      <span aria-live="polite">
        {t('pagination.summary', {
          first: fmt.integer(first),
          last: fmt.integer(last),
          total: fmt.integer(total),
        })}
      </span>
      <span className={styles.buttons}>
        <Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          {t('pagination.previous')}
        </Button>
        <Button size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          {t('pagination.next')}
        </Button>
      </span>
    </nav>
  );
}
