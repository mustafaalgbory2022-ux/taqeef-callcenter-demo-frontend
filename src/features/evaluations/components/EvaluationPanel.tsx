import { useScorecardVersions } from '@/features/scorecards';
import { combineQueries } from '@/shared/hooks/combineQueries';
import { useApiClient } from '@/shared/api/ApiProvider';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ScoreFlag, ScoreValue } from '@/shared/ui/ScoreValue';
import { EmptyState, QueryView } from '@/shared/ui/States';
import { useToast } from '@/shared/ui/Toaster';
import { versionOf } from '../model/versions';
import { currentEvaluations, historyByCall } from '../model/current';
import { useEvaluations, useRescore } from '../hooks/useEvaluationData';
import { CriterionResults, ProhibitedHits, type CriterionResultsProps } from './CriterionResults';
import { resultPresentation } from '../model/outcome';
import { NoScoreBadge } from './ResultValue';
import styles from './Evaluation.module.css';

export interface EvaluationPanelProps {
  callId: string;
  canRescore: boolean;
  onEvidence: CriterionResultsProps['onEvidence'];
  resolveEvidence: CriterionResultsProps['resolveEvidence'];
}

/** Current evaluation, evidence, re-scoring and history for one call. */
export function EvaluationPanel({
  callId,
  canRescore,
  onEvidence,
  resolveEvidence,
}: EvaluationPanelProps) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const allowed = usePermission('evaluations.rescore');
  const mock = useApiClient().mode === 'mock';
  const rescore = useRescore();
  const query = combineQueries([useEvaluations({ callId }), useScorecardVersions()] as const);

  async function runRescore(previous: number | null) {
    try {
      const result = await rescore.mutate(callId);
      toast(
        'success',
        t('evaluations.rescore.done', {
          version: result.scorecardVersion,
          score:
            result.displayHundredths === null
              ? t('evaluations.noScore')
              : fmt.hundredths(result.displayHundredths),
          previous: previous === null ? t('evaluations.noScore') : fmt.hundredths(previous),
        }),
      );
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }

  return (
    <QueryView query={query}>
      {([evaluations, versions]) => {
        const history = historyByCall(evaluations).get(callId) ?? [];
        // Same rule as dashboards: show the latest eligible evaluation.
        const latest = currentEvaluations(history)[0] ?? history[0];
        if (!latest)
          return (
            <Card title={t('evaluations.title')}>
              <EmptyState title={t('evaluations.none')} />
            </Card>
          );
        const version = versionOf(versions, latest);
        return (
          <>
            <Card
              title={t('evaluations.title')}
              caption={t('evaluations.caption', {
                version: latest.scorecardVersion,
                date: fmt.dateTime(latest.createdAt),
              })}
              actions={
                allowed && (
                  <Button
                    icon="refresh"
                    size="sm"
                    loading={rescore.isPending}
                    disabled={!canRescore}
                    onClick={() => runRescore(latest.displayHundredths)}
                  >
                    {t('evaluations.rescore.action')}
                  </Button>
                )
              }
              flush
            >
              <div className={styles.overall} data-testid="overall-score">
                {resultPresentation(latest) === 'not_assessable' ? (
                  <>
                    <NoScoreBadge kind="not_assessable" />
                    <span className={styles.summary}>
                      {t('evaluations.notAssessableOverall.body', {
                        minimum: fmt.points(latest.minimumAssessableUnits, latest.unit),
                      })}
                    </span>
                  </>
                ) : latest.outcome === 'insufficient_evidence' ||
                  latest.displayHundredths === null ? (
                  <>
                    <NoScoreBadge />
                    <span className={styles.summary}>
                      {t('evaluations.insufficient.body', {
                        assessable: fmt.points(latest.assessableUnits, latest.unit),
                        possible: fmt.points(latest.possibleUnits, latest.unit),
                        minimum: fmt.points(latest.minimumAssessableUnits, latest.unit),
                      })}
                    </span>
                  </>
                ) : (
                  <>
                    <span className={styles.overallValue}>
                      <ScoreValue hundredths={latest.displayHundredths} />
                    </span>
                    <ScoreFlag belowThreshold={latest.belowThreshold === true} />
                  </>
                )}
                <Badge tone={latest.trigger === 'rescore' ? 'accent' : 'neutral'}>
                  {t(`evaluations.trigger.${latest.trigger}`)}
                </Badge>
                {latest.preliminary && <Badge>{t('evaluations.preliminary')}</Badge>}
                {mock && <Badge tone="mock">{t('common.simulated')}</Badge>}
                {latest.outcome === 'scored' && (
                  <span className={styles.summary}>
                    {t('evaluations.awardedSummary', {
                      awarded: fmt.points(latest.awardedUnits, latest.unit),
                      assessable: fmt.points(latest.assessableUnits, latest.unit),
                      possible: fmt.points(latest.possibleUnits, latest.unit),
                    })}
                  </span>
                )}
              </div>
              <p className={styles.summary} data-testid="na-counts">
                {t('evaluations.aiDeclaredCount', { n: fmt.integer(latest.aiDeclaredCount) })}
                {' · '}
                {t('evaluations.codeNaCount', { n: fmt.integer(latest.codeNaCount) })}
              </p>
              <CriterionResults
                evaluation={latest}
                version={version}
                resolveEvidence={resolveEvidence}
                onEvidence={onEvidence}
              />
              <ProhibitedHits
                evaluation={latest}
                version={version}
                resolveEvidence={resolveEvidence}
                onEvidence={onEvidence}
              />
            </Card>
          </>
        );
      }}
    </QueryView>
  );
}
