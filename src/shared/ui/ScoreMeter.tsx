import type { ReactNode } from 'react';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { isLowScore, SCORE_MAX } from '@/shared/utils/score';
import { ScoreFlag, ScoreValue } from './ScoreValue';
import styles from './Score.module.css';

export interface ScoreMeterProps {
  label: string;
  score: number | null;
  threshold: number;
  meta?: ReactNode;
}

/** Horizontal 0–10 meter with a threshold tick; accessible as role="meter". */
export function ScoreMeter({ label, score, threshold, meta }: ScoreMeterProps) {
  const { t, fmt } = useI18n();
  const pct = (v: number) => `${(Math.max(0, Math.min(SCORE_MAX, v)) / SCORE_MAX) * 100}%`;
  const low = score !== null && isLowScore(score, threshold);
  return (
    <div className={styles.meter}>
      <div className={styles.meterHeader}>
        <span className={styles.meterLabel}>{label}</span>
        {score === null ? <span>{t('common.noScore')}</span> : <ScoreValue score={score} />}
      </div>
      <div
        className={styles.track}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={SCORE_MAX}
        aria-valuenow={score ?? 0}
        aria-valuetext={
          score === null
            ? t('common.noScore')
            : `${fmt.score(score)} ${t('common.outOfTen')}, ${low ? t('common.belowThreshold') : t('common.meetsThreshold')}`
        }
      >
        {score !== null && (
          <div
            className={`${styles.fill} ${low ? styles.lowFill : ''}`}
            style={{ inlineSize: pct(score) }}
          />
        )}
        <div className={styles.target} style={{ insetInlineStart: pct(threshold) }} />
      </div>
      <div className={styles.meterMeta}>
        {score !== null ? <ScoreFlag score={score} threshold={threshold} /> : <span />}
        {meta && <span>{meta}</span>}
      </div>
    </div>
  );
}
