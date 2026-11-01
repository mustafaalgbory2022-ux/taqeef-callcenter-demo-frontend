import type { ReactNode } from 'react';
import styles from './StatTile.module.css';

export interface StatTileProps {
  label: string;
  value: string;
  unit?: string | undefined;
  footnote?: ReactNode;
  /** Highlight as needing attention (always paired with text, never colour alone). */
  alert?: boolean;
  testId?: string | undefined;
}

export function StatTile({ label, value, unit, footnote, alert, testId }: StatTileProps) {
  return (
    <div className={styles.tile} data-testid={testId}>
      <span className={styles.label}>{label}</span>
      <span className={`${styles.value} ${alert ? styles.alert : ''}`}>
        <bdi>{value}</bdi>
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
      {footnote && <span className={styles.footnote}>{footnote}</span>}
    </div>
  );
}
