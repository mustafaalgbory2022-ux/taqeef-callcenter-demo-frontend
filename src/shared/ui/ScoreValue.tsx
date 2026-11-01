import { useI18n } from '@/shared/i18n/I18nProvider';
import { isLowScore } from '@/shared/utils/score';
import { Icon } from './Icon';
import styles from './Score.module.css';

/** "6.66 / 10" with the approved rounding (two decimals, rounded down). */
export function ScoreValue({ score }: { score: number }) {
  const { t, fmt } = useI18n();
  return (
    <span className={styles.value}>
      <bdi>{fmt.score(score)}</bdi>
      <span className={styles.max}>{t('common.outOfTen')}</span>
    </span>
  );
}

/** Text + shape indicator for the low-score rule (never colour alone). */
export function ScoreFlag({ score, threshold }: { score: number; threshold: number }) {
  const { t } = useI18n();
  const low = isLowScore(score, threshold);
  return (
    <span className={`${styles.flag} ${low ? styles.low : styles.ok}`}>
      <Icon name={low ? 'alert' : 'check'} />
      {low ? t('common.belowThreshold') : t('common.meetsThreshold')}
    </span>
  );
}
