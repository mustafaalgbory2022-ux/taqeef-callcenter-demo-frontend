import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Evaluation, ScorecardVersion } from '@/shared/types/domain';
import { Notice } from '@/shared/ui/Notice';
import { TableRegion } from '@/shared/ui/Table';
import { compareEvaluations } from '../model/compare';
import { Delta, OverallValue, PointsDelta, ResultValue } from './ResultValue';

/** Previous-versus-new comparison of two evaluations of the same call. */
export function ComparisonTable({
  before,
  after,
  versions,
}: {
  before: Evaluation;
  after: Evaluation;
  versions: readonly ScorecardVersion[];
}) {
  const { t, pick, fmt } = useI18n();
  const cmp = compareEvaluations(before, after, versions);
  return (
    <>
      {cmp.versionChanged && (
        <Notice
          tone="info"
          title={t('evaluations.compare.versionChanged', {
            from: before.scorecardVersion,
            to: after.scorecardVersion,
          })}
        />
      )}
      <TableRegion label={t('evaluations.compare.title')}>
        <thead>
          <tr>
            <th scope="col">{t('evaluations.compare.criterion')}</th>
            <th scope="col">
              {t('evaluations.compare.before')} <bdi>({fmt.date(before.createdAt)})</bdi>
            </th>
            <th scope="col">
              {t('evaluations.compare.after')} <bdi>({fmt.date(after.createdAt)})</bdi>
            </th>
            <th scope="col">{t('evaluations.compare.change')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{t('evaluations.overall')}</th>
            <td>
              <OverallValue evaluation={before} />
            </td>
            <td>
              <OverallValue evaluation={after} />
            </td>
            <td>
              <Delta from={before.overallScore} to={after.overallScore} />
            </td>
          </tr>
          {cmp.criteria.map((row) => (
            <tr key={row.criterionId}>
              <th scope="row">{pick(row.label)}</th>
              <td>
                <ResultValue result={row.before} />
              </td>
              <td>
                <ResultValue result={row.after} />
              </td>
              <td>
                <PointsDelta
                  delta={row.pointsDelta}
                  possibleFrom={row.before?.possiblePoints}
                  possibleTo={row.after?.possiblePoints}
                />
              </td>
            </tr>
          ))}
          <tr>
            <th scope="row">{t('evaluations.prohibited.title')}</th>
            <td>
              <bdi>{fmt.integer(cmp.hitsBefore)}</bdi>
            </td>
            <td>
              <bdi>{fmt.integer(cmp.hitsAfter)}</bdi>
            </td>
            <td />
          </tr>
        </tbody>
      </TableRegion>
    </>
  );
}
