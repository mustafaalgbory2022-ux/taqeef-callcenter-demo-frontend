import { useI18n } from '@/shared/i18n/I18nProvider';
import { Icon } from './Icon';
import styles from './Score.module.css';

/**
 * An evaluation score, "6.99 / 10", from the backend's integer `display_hundredths`
 * (contract v0.1 3.4): truncated, never rounded, no float arithmetic.
 */
export function ScoreValue({ hundredths }: { hundredths: number }) {
  const { t, fmt } = useI18n();
  return (
    <span className={styles.value} data-hundredths={hundredths}>
      <bdi>{fmt.hundredths(hundredths)}</bdi>
      <span className={styles.max}>{t('common.outOfTen')}</span>
    </span>
  );
}

/**
 * Text + shape indicator for the low-score rule (never colour alone). The flag is the
 * backend's `below_threshold` for the run (contract v0.1 3.7); the frontend never recomputes it.
 */
export function ScoreFlag({ belowThreshold }: { belowThreshold: boolean }) {
  const { t } = useI18n();
  return (
    <span className={`${styles.flag} ${belowThreshold ? styles.low : styles.ok}`}>
      <Icon name={belowThreshold ? 'alert' : 'check'} />
      {belowThreshold ? t('common.belowThreshold') : t('common.meetsThreshold')}
    </span>
  );
}
