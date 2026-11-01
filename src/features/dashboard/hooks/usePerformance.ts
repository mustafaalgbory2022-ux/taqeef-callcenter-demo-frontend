import { useMemo } from 'react';
import { useAgents } from '@/features/agents';
import { useEvaluations } from '@/features/evaluations';
import type { DateRange } from '@/shared/types/domain';
import { useScorecardVersions } from '@/features/scorecards';
import { combineQueries } from '@/shared/hooks/combineQueries';
import { weekKey } from '@/shared/utils/dates';
import {
  currentEvaluations,
  filterByVersion,
  summarize,
  summarizeByAgent,
  weeklyQuality,
} from '../model/aggregate';
import { useVersionParam } from './useVersionParam';

/** Loads evaluations, scorecard versions and agents, and derives pooled summaries. */
export function usePerformance(agentId: string | null, range?: DateRange, queueId?: string | null) {
  const [version, setVersion] = useVersionParam();
  const evaluations = useEvaluations({
    agentId: agentId ?? undefined,
    from: range?.from,
    to: range?.to,
    queueId: queueId ?? undefined,
  });
  const versions = useScorecardVersions();
  const agents = useAgents();
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
      byAgent: summarizeByAgent(current, agentList, vers, version),
      agents: agentList,
      weekly: weeklyQuality(current, weekKey),
    };
  }, [query.status, query.data, version]);

  return { query, derived, version, setVersion };
}
