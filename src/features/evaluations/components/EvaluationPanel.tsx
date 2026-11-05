import { useScorecardVersions } from '@/features/scorecards';
import { combineQueries } from '@/shared/hooks/combineQueries';
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
            result.overallScore === null
              ? t('evaluations.noScore')
              : fmt.score(result.overallScore),
          previous: previous === null ? t('evaluations.noScore') : fmt.score(previous),
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
                    onClick={() => runRescore(latest.overallScore)}
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
                        minimum: fmt.integer(latest.minimumAssessablePoints),
                      })}
                    </span>
                  </>
                ) : latest.outcome === 'insufficient_evidence' || latest.overallScore === null ? (
                  <>
                    <NoScoreBadge />
                    <span className={styles.summary}>
                      {t('evaluations.insufficient.body', {
                        assessable: fmt.integer(latest.assessablePoints),
                        possible: fmt.integer(latest.possiblePoints),
                        minimum: fmt.integer(latest.minimumAssessablePoints),
                      })}
                    </span>
                  </>
                ) : (
                  <>
                    <span className={styles.overallValue}>
                      <ScoreValue score={latest.overallScore} />
                    </span>
                    <ScoreFlag
                      score={latest.overallScore}
                      threshold={version?.lowScoreThreshold ?? 7}
                    />
                  </>
                )}
                <Badge tone={latest.trigger === 'rescore' ? 'accent' : 'neutral'}>
                  {t(`evaluations.trigger.${latest.trigger}`)}
                </Badge>
                {latest.simulated && <Badge tone="mock">{t('common.simulated')}</Badge>}
                {latest.outcome === 'scored' && (
                  <span className={styles.summary}>
                    {t('evaluations.awardedSummary', {
                      awarded: fmt.integer(latest.awardedPoints),
                      assessable: fmt.integer(latest.assessablePoints),
                      possible: fmt.integer(latest.possiblePoints),
                    })}
                  </span>
                )}
              </div>
              <CriterionResults
                evaluation={latest}
                version={version}
                resolveEvidence={resolveEvidence}
                onEvidence={onEvidence}
              />
              <ProhibitedHits
                evaluation={latest}
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
