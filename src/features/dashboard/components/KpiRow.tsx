import { useI18n } from '@/shared/i18n/I18nProvider';
import { StatTile } from '@/shared/ui/StatTile';
import type { PerformanceSummary } from '../model/aggregate';
import styles from './Dashboard.module.css';

export function KpiRow({ summary }: { summary: PerformanceSummary }) {
  const { t, fmt } = useI18n();
  const n = summary.scoredCalls;
  return (
    <section className={styles.kpis} aria-label={t('dashboard.kpi.label')}>
      <StatTile
        testId="kpi-evaluated"
        label={t('dashboard.kpi.evaluated')}
        value={fmt.integer(n)}
        footnote={t('dashboard.kpi.evaluatedNote', { k: fmt.integer(summary.insufficientCalls) })}
      />
      <StatTile
        testId="kpi-average"
        label={t('dashboard.kpi.average')}
        value={summary.averageScore === null ? '—' : fmt.score(summary.averageScore)}
        unit={t('common.outOfTen')}
        footnote={t('dashboard.kpi.averageNote', { n: fmt.integer(n) })}
      />
      <StatTile
        testId="kpi-low"
        label={
          summary.mixedThresholds
            ? t('dashboard.kpi.lowMixed')
            : t('dashboard.kpi.low', { threshold: fmt.score(summary.threshold) })
        }
        value={fmt.integer(summary.lowScoreCalls)}
        unit={t('dashboard.kpi.ofN', { n: fmt.integer(n) })}
        alert={summary.lowScoreCalls > 0}
        footnote={t('dashboard.kpi.lowNote')}
      />
      <StatTile
        label={t('dashboard.kpi.versions')}
        value={
          summary.scorecardVersions.length
            ? summary.scorecardVersions.map((v) => `v${v}`).join(', ')
            : '—'
        }
        footnote={t('dashboard.kpi.versionsNote')}
      />
    </section>
  );
}
