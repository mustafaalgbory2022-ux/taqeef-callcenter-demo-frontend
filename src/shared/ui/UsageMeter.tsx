import type { ReactNode } from 'react';
import styles from './UsageMeter.module.css';

/**
 * Capacity indicator with a text value (never colour-only). Exposed as an ARIA meter so the
 * percentage is announced; colour changes at the warning and critical thresholds.
 */
export function UsageMeter({
  label,
  pct,
  status,
  valueText,
  children,
}: {
  label: string;
  pct: number;
  status: 'ok' | 'warning' | 'critical' | 'unavailable';
  valueText: string;
  children?: ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={styles.wrap}>
      <div className={styles.label}>
        <span>{label}</span>
        <bdi>{valueText}</bdi>
      </div>
      <div
        className={styles.track}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        aria-valuetext={valueText}
      >
        <div
          className={`${styles.bar} ${status === 'warning' ? styles.warning : status === 'critical' ? styles.critical : ''}`}
          style={{ inlineSize: `${clamped}%` }}
        />
      </div>
      {children}
    </div>
  );
}
