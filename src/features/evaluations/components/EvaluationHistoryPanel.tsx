import { useScorecardVersions } from '@/features/scorecards';
import { combineQueries } from '@/shared/hooks/combineQueries';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Card } from '@/shared/ui/Card';
import { QueryView } from '@/shared/ui/States';
import { useEvaluations } from '../hooks/useEvaluationData';
import { historyByCall } from '../model/current';
import { EvaluationHistory } from './EvaluationHistory';

/** Immutable evaluation history of one call with previous-versus-new comparison. */
export function EvaluationHistoryPanel({ callId }: { callId: string }) {
  const { t, fmt } = useI18n();
  const query = combineQueries([useEvaluations({ callId }), useScorecardVersions()] as const);
  return (
    <QueryView query={query}>
      {([evaluations, versions]) => {
        const history = historyByCall(evaluations).get(callId) ?? [];
        if (history.length === 0) return null;
        return (
          <Card
            title={t('evaluations.history.title')}
            caption={t('evaluations.history.caption', { n: fmt.integer(history.length) })}
            flush
          >
            <EvaluationHistory key={history[0]?.id} history={history} versions={versions} />
          </Card>
        );
      }}
    </QueryView>
  );
}
