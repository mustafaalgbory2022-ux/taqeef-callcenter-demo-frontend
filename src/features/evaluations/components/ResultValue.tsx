import { useI18n } from '@/shared/i18n/I18nProvider';
import type { CriterionEvaluation } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Icon } from '@/shared/ui/Icon';
import { ScoreValue } from '@/shared/ui/ScoreValue';
import { floorTo2 } from '@/shared/utils/score';
import styles from './Evaluation.module.css';

/** Score, or a clearly distinct "Not assessable" / "Insufficient evidence" state. */
export function ResultValue({ result }: { result: CriterionEvaluation | null }) {
  const { t } = useI18n();
  if (!result) return <span className={styles.same}>{t('evaluations.result.absent')}</span>;
  if (result.result === 'scored' && result.score !== null)
    return <ScoreValue score={result.score} />;
  if (result.result === 'not_assessable')
    return <Badge icon="minus">{t('evaluations.result.notAssessable')}</Badge>;
  return (
    <Badge tone="warning" icon="alert">
      {t('evaluations.result.insufficient')}
    </Badge>
  );
}

/** Signed score change with arrow + text (not colour alone). */
export function Delta({ from, to }: { from: number | null; to: number | null }) {
  const { t, fmt } = useI18n();
  if (from === null || to === null) return <span className={styles.same}>—</span>;
  const d = floorTo2(to) - floorTo2(from);
  const cls = d > 0.004 ? styles.up : d < -0.004 ? styles.down : styles.same;
  const icon = d > 0.004 ? 'arrowUp' : d < -0.004 ? 'arrowDown' : 'minus';
  const label =
    d > 0.004
      ? t('evaluations.delta.up')
      : d < -0.004
        ? t('evaluations.delta.down')
        : t('evaluations.delta.same');
  return (
    <span className={`${styles.delta} ${cls}`}>
      <Icon name={icon} size={14} />
      <bdi>{fmt.scoreDelta(from, to)}</bdi>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
