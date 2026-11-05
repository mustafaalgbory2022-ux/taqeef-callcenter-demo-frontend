import { useI18n } from '@/shared/i18n/I18nProvider';
import type { DashboardSummary } from '@/shared/types/domain';
import { ScoreFlag } from '@/shared/ui/ScoreValue';
import { StatTile } from '@/shared/ui/StatTile';
import styles from './Dashboard.module.css';

/** Server figures only (contract v0.3 §11.4); nothing is recomputed here. */
export function KpiRow({ summary }: { summary: DashboardSummary }) {
  const { t, fmt } = useI18n();
  const n = summary.outcomes.scored;
  const th = summary.threshold;
  const extra = [
    summary.outcomes.notAssessable > 0 &&
      t('dashboard.kpi.notAssessableNote', { k: fmt.integer(summary.outcomes.notAssessable) }),
    summary.evaluationFailed > 0 &&
      t('dashboard.kpi.failedNote', { k: fmt.integer(summary.evaluationFailed) }),
  ].filter(Boolean);
  return (
    <section className={styles.kpis} aria-label={t('dashboard.kpi.label')}>
      <StatTile
        testId="kpi-evaluated"
        label={t('dashboard.kpi.evaluated')}
        value={fmt.integer(n)}
        footnote={[
          t('dashboard.kpi.evaluatedNote', {
            k: fmt.integer(summary.outcomes.insufficientEvidence),
          }),
          ...extra,
        ].join(' · ')}
      />
      <StatTile
        testId="kpi-average"
        label={t('dashboard.kpi.average')}
        value={summary.average === null ? '—' : fmt.hundredths(summary.average.displayHundredths)}
        unit={t('common.outOfTen')}
        footnote={
          <>
            {t('dashboard.kpi.averageNote', { n: fmt.integer(summary.average?.basedOnN ?? 0) })}
            {/* §11.2: a pass/low label only when all selected runs share one threshold. */}
            {th.mode === 'single' && (
              <span data-testid="average-classification">
                {' '}
                <ScoreFlag belowThreshold={th.averageBelowThreshold} />{' '}
                {t('dashboard.kpi.averageThreshold', {
                  threshold: fmt.hundredths(th.thresholdHundredths),
                })}
              </span>
            )}
            {th.mode === 'mixed' && (
              <span data-testid="average-mixed"> · {t('dashboard.kpi.averageMixed')}</span>
            )}
          </>
        }
      />
      <StatTile
        testId="kpi-low"
        label={
          th.mode === 'single'
            ? t('dashboard.kpi.low', { threshold: fmt.hundredths(th.thresholdHundredths) })
            : t('dashboard.kpi.lowMixed')
        }
        value={fmt.integer(summary.belowThresholdCount)}
        unit={t('dashboard.kpi.ofN', { n: fmt.integer(n) })}
        alert={summary.belowThresholdCount > 0}
        footnote={t('dashboard.kpi.lowNote')}
      />
      <StatTile
        testId="kpi-calls"
        label={t('dashboard.kpi.calls')}
        value={fmt.integer(summary.callsTotal)}
        footnote={t('dashboard.kpi.callsNote', {
          k: fmt.integer(summary.notYetEvaluated),
        })}
      />
    </section>
  );
}
