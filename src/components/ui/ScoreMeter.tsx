import { SCORE_MAX, SCORE_MIN, scoreBand } from '@/api/contract';
import { BandIcon } from './BandIcon';
import styles from './ScoreMeter.module.css';

export interface ScoreMeterProps {
  label: string;
  score: number;
  target: number;
  bandLabels: Record<'high' | 'mid' | 'low', string>;
  formattedScore: string;
  maxLabel: string;
  meta?: string;
}

export function ScoreMeter({
  label,
  score,
  target,
  bandLabels,
  formattedScore,
  maxLabel,
  meta,
}: ScoreMeterProps) {
  const band = scoreBand(score, target);
  const pct = (v: number) => `${((v - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100}%`;
  return (
    <div className={`${styles.root} ${styles[band]}`}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>
          {formattedScore} <span className={styles.max}>{maxLabel}</span>
        </span>
      </div>
      <div
        className={styles.track}
        role="meter"
        aria-label={label}
        aria-valuemin={SCORE_MIN}
        aria-valuemax={SCORE_MAX}
        aria-valuenow={score}
        aria-valuetext={`${formattedScore} ${maxLabel}, ${bandLabels[band]}`}
      >
        <div className={styles.fill} style={{ inlineSize: pct(score) }} />
        <div className={styles.target} style={{ insetInlineStart: pct(target) }} />
      </div>
      <div className={styles.meta}>
        <span className={styles.band}>
          <BandIcon band={band} />
          {bandLabels[band]}
        </span>
        {meta && <span>{meta}</span>}
      </div>
    </div>
  );
}
