import { useI18n } from '@/shared/i18n/I18nProvider';
import type { DashboardSummary } from '@/shared/types/domain';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/States';
import { tableStyles, TableRegion } from '@/shared/ui/Table';

/**
 * How often each criterion was met, as counted by the server (contract v0.3 §11.4): one row
 * per (criterion, criterion version), names from the server. No browser-computed scores.
 */
export function CriteriaPerformance({ summary }: { summary: DashboardSummary }) {
  const { t, pick, fmt } = useI18n();
  return (
    <Card title={t('dashboard.criteria.title')} caption={t('dashboard.criteria.caption')} flush>
      {summary.criteria.length === 0 ? (
        <EmptyState title={t('dashboard.empty')} />
      ) : (
        <TableRegion label={t('dashboard.criteria.title')}>
          <thead>
            <tr>
              <th scope="col">{t('dashboard.criteria.criterion')}</th>
              <th scope="col">{t('evaluations.result.met')}</th>
              <th scope="col">{t('evaluations.result.partially_met')}</th>
              <th scope="col">{t('evaluations.result.not_met')}</th>
              <th scope="col">{t('evaluations.result.notAssessable')}</th>
            </tr>
          </thead>
          <tbody>
            {summary.criteria.map((c) => (
              <tr
                key={`${c.criterionId}-${c.criterionVersion}`}
                data-testid={`criterion-summary-${c.criterionId}`}
              >
                <th scope="row">{pick(c.name)}</th>
                <td className={tableStyles.mono}>{fmt.integer(c.met)}</td>
                <td className={tableStyles.mono}>{fmt.integer(c.partiallyMet)}</td>
                <td className={tableStyles.mono}>{fmt.integer(c.notMet)}</td>
                <td className={tableStyles.mono}>{fmt.integer(c.notAssessable)}</td>
              </tr>
            ))}
          </tbody>
        </TableRegion>
      )}
    </Card>
  );
}
