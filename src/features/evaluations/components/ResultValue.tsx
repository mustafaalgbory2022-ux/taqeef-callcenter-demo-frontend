import { useI18n } from '@/shared/i18n/I18nProvider';
import type { CriterionEvaluation, Evaluation } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Icon } from '@/shared/ui/Icon';
import { ScoreValue } from '@/shared/ui/ScoreValue';
import { floorTo2 } from '@/shared/utils/score';
import { resultPresentation } from '../model/outcome';
import styles from './Evaluation.module.css';

/**
 * ACTUAL points awarded for a criterion ("2 of 3 points"), or a clearly distinct
 * "Not assessable" / "Insufficient evidence" state. Never shown on the 0–10 scale.
 */
export function ResultValue({ result }: { result: CriterionEvaluation | null }) {
  const { t, fmt } = useI18n();
  if (!result) return <span className={styles.same}>{t('evaluations.result.absent')}</span>;
  if (result.result === 'scored' && result.awardedPoints !== null) {
    return (
      <span className={styles.points} title={t('evaluations.pointsTitle')}>
        <bdi>
          {t(result.possiblePoints === 1 ? 'evaluations.pointsOne' : 'evaluations.points', {
            awarded: fmt.integer(result.awardedPoints),
            possible: fmt.integer(result.possiblePoints),
          })}
        </bdi>
        {result.penaltyPoints > 0 && (
          <span className={styles.penalty}>
            {t('evaluations.penaltyNote', { n: fmt.integer(result.penaltyPoints) })}
          </span>
        )}
      </span>
    );
  }
  if (result.result === 'not_assessable')
    return <Badge icon="minus">{t('evaluations.result.notAssessable')}</Badge>;
  return (
    <Badge tone="warning" icon="alert">
      {t('evaluations.result.insufficient')}
    </Badge>
  );
}

/**
 * Whole-evaluation "No score" badge: "Insufficient evidence — No score" (too few assessable
 * points) or "Not assessable — No score" (none at all). Never shown as a 0 score.
 */
export function NoScoreBadge({
  kind = 'insufficient_evidence',
}: {
  kind?: 'insufficient_evidence' | 'not_assessable';
}) {
  const { t } = useI18n();
  return kind === 'not_assessable' ? (
    <Badge icon="minus">{t('evaluations.notAssessableOverall.title')}</Badge>
  ) : (
    <Badge tone="warning" icon="alert">
      {t('evaluations.insufficient.title')}
    </Badge>
  );
}

/** Overall result of one evaluation: score, "No score" (insufficient evidence) or "Failed". */
export function OverallValue({
  evaluation,
}: {
  evaluation: Pick<Evaluation, 'status' | 'outcome' | 'overallScore' | 'assessablePoints'>;
}) {
  const { t } = useI18n();
  const kind = resultPresentation(evaluation);
  if (kind === 'failed') {
    return (
      <Badge tone="danger" icon="alert">
        {t('evaluations.failed')}
      </Badge>
    );
  }
  return kind === 'scored' && evaluation.overallScore !== null ? (
    <ScoreValue score={evaluation.overallScore} />
  ) : (
    <NoScoreBadge kind={kind === 'not_assessable' ? 'not_assessable' : 'insufficient_evidence'} />
  );
}

function trend(d: number) {
  return d > 0.004 ? 'up' : d < -0.004 ? 'down' : 'same';
}

function DeltaView({ d, text }: { d: number; text: string }) {
  const { t } = useI18n();
  const dir = trend(d);
  const icon = dir === 'up' ? 'arrowUp' : dir === 'down' ? 'arrowDown' : 'minus';
  return (
    <span className={`${styles.delta} ${styles[dir]}`}>
      <Icon name={icon} size={14} />
      <bdi>{text}</bdi>
      <span className="visually-hidden">{t(`evaluations.delta.${dir}`)}</span>
    </span>
  );
}

/** Signed change of the 0–10 evaluation score (each side floored first). */
export function Delta({ from, to }: { from: number | null; to: number | null }) {
  const { fmt } = useI18n();
  if (from === null || to === null) return <span className={styles.same}>—</span>;
  return <DeltaView d={floorTo2(to) - floorTo2(from)} text={fmt.scoreDelta(from, to)} />;
}

/** Signed change in ACTUAL criterion points, e.g. "+1 point"; none when the maximum changed. */
export function PointsDelta({
  delta,
  possibleFrom,
  possibleTo,
}: {
  delta: number | null;
  possibleFrom?: number | undefined;
  possibleTo?: number | undefined;
}) {
  const { t, fmt } = useI18n();
  if (possibleFrom !== undefined && possibleTo !== undefined && possibleFrom !== possibleTo) {
    return (
      <span className={styles.same}>
        {t('evaluations.compare.possibleChanged', {
          from: fmt.integer(possibleFrom),
          to: fmt.integer(possibleTo),
        })}
      </span>
    );
  }
  if (delta === null) return <span className={styles.same}>—</span>;
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  return (
    <DeltaView
      d={delta}
      text={t(Math.abs(delta) === 1 ? 'evaluations.pointsDeltaOne' : 'evaluations.pointsDelta', {
        sign,
        n: fmt.integer(Math.abs(delta)),
      })}
    />
  );
}
