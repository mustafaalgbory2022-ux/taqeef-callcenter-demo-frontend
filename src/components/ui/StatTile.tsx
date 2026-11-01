import styles from './StatTile.module.css';

export interface StatTileProps {
  label: string;
  value: string;
  unit?: string;
  footnote?: string;
}

export function StatTile({ label, value, unit, footnote }: StatTileProps) {
  return (
    <div className={styles.tile}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>
        {value}
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
      {footnote && <span className={styles.footnote}>{footnote}</span>}
    </div>
  );
}
