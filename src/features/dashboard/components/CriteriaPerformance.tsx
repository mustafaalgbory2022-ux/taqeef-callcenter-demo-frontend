import { useI18n } from '@/shared/i18n/I18nProvider';
import { Card } from '@/shared/ui/Card';
import { ScoreMeter } from '@/shared/ui/ScoreMeter';
import { EmptyState } from '@/shared/ui/States';
import type { PerformanceSummary } from '../model/aggregate';
import styles from './Dashboard.module.css';

/**
 * Criterion meters are NORMALIZED to 10 (pooled awarded ÷ possible points); the actual
 * points behind each meter are always shown next to it.
 */
export function CriteriaPerformance({ summary }: { summary: PerformanceSummary }) {
  const { t, pick, fmt } = useI18n();
  return (
    <Card
      title={t('dashboard.criteria.title')}
      caption={t('dashboard.criteria.caption', {
        threshold: fmt.score(summary.threshold),
        version: summary.thresholdVersion ?? '—',
      })}
    >
      {summary.scoredCalls === 0 ? (
        <EmptyState title={t('dashboard.empty')} />
      ) : (
        <ul className={styles.criteria}>
          {summary.criteria.map((c) => (
            <li key={c.criterionId} data-testid={`criterion-summary-${c.criterionId}`}>
              <ScoreMeter
                label={pick(c.label)}
                score={c.normalized}
                threshold={summary.threshold}
                meta={
                  <span className={styles.counts}>
                    <bdi>
                      {t('dashboard.criteria.points', {
                        awarded: fmt.integer(c.awardedPoints),
                        possible: fmt.integer(c.possiblePoints),
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
