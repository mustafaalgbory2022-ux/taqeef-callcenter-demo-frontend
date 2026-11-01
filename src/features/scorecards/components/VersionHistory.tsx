import { useI18n } from '@/shared/i18n/I18nProvider';
import type { ScorecardVersion } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import styles from './VersionHistory.module.css';

/** Read-only list of immutable scorecard versions (the audit history of the scorecard). */
export function VersionHistory({ versions }: { versions: readonly ScorecardVersion[] }) {
  const { t, pick, fmt } = useI18n();
  const latest = Math.max(...versions.map((v) => v.version));
  return (
    <ol className={styles.list}>
      {versions.map((v) => (
        <li key={v.version} className={styles.version}>
          <details>
            <summary className={styles.summary}>
              <span className={styles.title}>
                <bdi>v{v.version}</bdi>
              </span>
              {v.version === latest && (
                <Badge tone="accent">{t('scorecards.history.current')}</Badge>
              )}
              <span className={styles.meta}>
                <bdi>{fmt.dateTime(v.createdAt)}</bdi> · {v.createdBy}
              </span>
              <span className={styles.meta} dir="auto">
                {v.changeNote}
              </span>
            </summary>
            <div className={styles.body}>
              <p>
                {t('scorecards.history.threshold', { value: fmt.score(v.lowScoreThreshold) })} ·{' '}
                {t('scorecards.history.counts', {
                  criteria: v.criteria.length,
                  points: v.criteria.reduce((sum, c) => sum + c.maxPoints, 0),
                  minimum: v.minimumAssessablePoints,
                  expressions: v.prohibitedExpressions.length,
                })}
              </p>
              <ul>
                {v.criteria.map((c) => (
                  <li key={c.id}>
                    {pick(c.label)} — <bdi>{c.maxPoints}</bdi> {t('scorecards.criteria.points')}
                  </li>
                ))}
              </ul>
              <p>
                {v.prohibitedPenalty.points > 0
                  ? t('scorecards.history.penaltyActive', {
                      points: v.prohibitedPenalty.points,
                      criterion: pick(
                        v.criteria.find((c) => c.id === v.prohibitedPenalty.criterionId)?.label ?? {
                          en: '—',
                          ar: '—',
                        },
                      ),
                    })
                  : t('scorecards.history.penaltyNone')}
              </p>
              {v.prohibitedExpressions.length > 0 && (
                <p>
                  {t('scorecards.prohibited.title')}:{' '}
                  {v.prohibitedExpressions.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 && ', '}
                      <bdi>“{p.phrase}”</bdi>
                    </span>
                  ))}
                </p>
              )}
            </div>
          </details>
        </li>
      ))}
    </ol>
  );
}
