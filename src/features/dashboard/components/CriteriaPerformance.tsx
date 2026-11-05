import { useI18n } from '@/shared/i18n/I18nProvider';
import { Card } from '@/shared/ui/Card';
import { ScoreMeter } from '@/shared/ui/ScoreMeter';
import { EmptyState } from '@/shared/ui/States';
import type { PerformanceSummary } from '../model/aggregate';
import styles from './Dashboard.module.css';

/**
 * PROVISIONAL VISUALIZATION: criterion meters are computed in the browser, NORMALIZED to 10
 * (pooled awarded ÷ possible points). They are not backend evaluation scores and no low-score
 * threshold is applied to them. The actual points behind each meter are shown next to it.
 */
export function CriteriaPerformance({ summary }: { summary: PerformanceSummary }) {
  const { t, pick, fmt } = useI18n();
  return (
    <Card title={t('dashboard.criteria.title')} caption={t('dashboard.criteria.caption')}>
      {summary.scoredCalls === 0 ? (
        <EmptyState title={t('dashboard.empty')} />
      ) : (
        <ul className={styles.criteria}>
          {summary.criteria.map((c) => (
            <li key={c.criterionId} data-testid={`criterion-summary-${c.criterionId}`}>
              <ScoreMeter
                label={pick(c.label)}
                score={c.normalized}
                threshold={null}
                meta={
                  <span className={styles.counts}>
                    <bdi>
                      {t('dashboard.criteria.points', {
                        awarded: fmt.points(c.awardedHalfPoints, 2),
                        possible: fmt.points(c.possibleHalfPoints, 2),
                      })}
                    </bdi>
                    {' · '}
                    {t('dashboard.criteria.n', { n: fmt.integer(c.scoredCount) })}
                    {c.notAssessableCount > 0 &&
                      ` · ${t('dashboard.criteria.notAssessable', { n: fmt.integer(c.notAssessableCount) })}`}
                    {c.insufficientCount > 0 &&
                      ` · ${t('dashboard.criteria.insufficient', { n: fmt.integer(c.insufficientCount) })}`}
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
