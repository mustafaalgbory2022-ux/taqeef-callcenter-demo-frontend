import { useMemo } from 'react';
import { useAgents } from '@/features/agents';
import { useScorecardVersions } from '@/features/scorecards';
import { combineQueries } from '@/shared/hooks/combineQueries';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useVersionParam } from './useVersionParam';

/**
 * Dashboard figures come from the server (`GET /api/dashboard`, contract v0.3 §11): the
 * frontend never recomputes averages, populations or threshold classifications. The agent is
 * a filter only (no per-agent arrays, no comparison). Keyed under "evaluations" so re-scores
 * refresh it.
 */
export function usePerformance(agentId: string | null) {
  const [version, setVersion] = useVersionParam();
  const versions = useScorecardVersions();
  const agents = useAgents({ includeRetired: true });
  const versionId =
    versions.status === 'success' && version !== null
      ? (versions.data.find((v) => v.version === version)?.scorecardVersionId ?? null)
      : null;
  const dashboard = useApiQuery(
    ['evaluations', 'dashboard', versionId, agentId],
    (api) => api.getDashboard({ scorecardVersionId: versionId, agentId }),
    { enabled: versions.status === 'success' },
  );
  const query = combineQueries([dashboard, versions, agents] as const);

  const derived = useMemo(() => {
    if (query.status !== 'success') return null;
    const [summary, vers, agentList] = query.data;
    return {
      summary,
      availableVersions: [...new Set(vers.map((v) => v.version))].sort((a, b) => a - b),
      agents: agentList,
    };
  }, [query.status, query.data]);

  return { query, derived, version, setVersion };
}
