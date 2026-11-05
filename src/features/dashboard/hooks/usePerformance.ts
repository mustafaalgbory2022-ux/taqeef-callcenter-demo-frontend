import { useMemo } from 'react';
import { useAgents } from '@/features/agents';
import { useEvaluations } from '@/features/evaluations';
import { useScorecardVersions } from '@/features/scorecards';
import { combineQueries } from '@/shared/hooks/combineQueries';
import { currentEvaluations, filterByVersion, summarize } from '../model/aggregate';
import { useVersionParam } from './useVersionParam';

/** Loads evaluations, scorecard versions and agents, and derives pooled summaries. */
export function usePerformance(agentId: string | null) {
  const [version, setVersion] = useVersionParam();
  const evaluations = useEvaluations({ agentId: agentId ?? undefined });
  const versions = useScorecardVersions();
  const agents = useAgents({ includeRetired: true });
  const query = combineQueries([evaluations, versions, agents] as const);

  const derived = useMemo(() => {
    if (query.status !== 'success') return null;
    const [evals, vers, agentList] = query.data;
    const all = currentEvaluations(evals);
    const current = filterByVersion(all, version);
    return {
      current,
      availableVersions: [...new Set(all.map((e) => e.scorecardVersion))].sort((a, b) => a - b),
      summary: summarize(current, vers, version),
      agents: agentList,
    };
  }, [query.status, query.data, version]);

  return { query, derived, version, setVersion };
}
