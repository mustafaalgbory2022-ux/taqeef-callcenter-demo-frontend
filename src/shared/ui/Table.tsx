import type { ReactNode } from 'react';
import styles from './Table.module.css';

export const tableStyles = styles;

/** Horizontally scrollable, keyboard-focusable table region (WCAG scrollable-region). */
export function TableRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.region} role="region" aria-label={label} tabIndex={0}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}
