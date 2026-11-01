import type { ApiMode } from '@/shared/api/config';
import { useI18n } from '@/shared/i18n/I18nProvider';
import styles from './DataSourceBadge.module.css';

/** Always visible: mock (simulated, synthetic) vs live backend data. */
export function DataSourceBadge({ mode }: { mode: ApiMode }) {
  const { t } = useI18n();
  return (
    <span
      className={`${styles.badge} ${styles[mode]}`}
      data-testid="data-source"
      data-mode={mode}
      title={mode === 'mock' ? t('common.mockHint') : undefined}
    >
      <span className={styles.dot} aria-hidden="true" />
      {mode === 'mock' ? t('common.mockData') : t('common.liveData')}
    </span>
  );
}
