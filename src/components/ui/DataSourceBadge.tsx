import type { ApiMode } from '@/config/env';
import styles from './DataSourceBadge.module.css';

/** Always-visible indicator so mocked behaviour is never mistaken for the live API. */
export function DataSourceBadge({ mode, label }: { mode: ApiMode; label: string }) {
  return (
    <span className={`${styles.badge} ${styles[mode]}`} data-testid="data-source" data-mode={mode}>
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </span>
  );
}
