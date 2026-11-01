import { useI18n } from '@/shared/i18n/I18nProvider';
import { Card } from '@/shared/ui/Card';
import { ScoreMeter } from '@/shared/ui/ScoreMeter';
import { EmptyState } from '@/shared/ui/States';
import type { PerformanceSummary } from '../model/aggregate';
import styles from './Dashboard.module.css';

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
      {summary.evaluatedCalls === 0 ? (
        <EmptyState title={t('dashboard.empty')} />
      ) : (
        <ul className={styles.criteria}>
          {summary.criteria.map((c) => (
            <li key={c.criterionId}>
              <ScoreMeter
                label={pick(c.label)}
                score={c.average}
                threshold={summary.threshold}
                meta={
                  <span className={styles.counts}>
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
