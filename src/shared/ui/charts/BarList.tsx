import styles from './Charts.module.css';

export interface BarItem {
  key: string;
  label: string;
  value: number;
  display: string;
}

/** Horizontal bars for a ranked categorical breakdown (single colour, labelled values). */
export function BarList({ items, label }: { items: readonly BarItem[]; label: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={styles.bars} aria-label={label}>
      {items.map((item) => (
        <li key={item.key} className={styles.barRow}>
          <span>{item.label}</span>
          <span className={styles.track} aria-hidden="true">
            <span className={styles.fill} style={{ inlineSize: `${(item.value / max) * 100}%` }} />
          </span>
          <span className={styles.barValue}>
            <bdi>{item.display}</bdi>
          </span>
        </li>
      ))}
    </ul>
  );
}
