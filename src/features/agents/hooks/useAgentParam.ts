import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

export const AGENT_PARAM = 'agent';

/**
 * The agent filter lives in the URL (?agent=<id>) so filtered views are shareable,
 * survive reloads and carry across Dashboard → Calls → Evaluations.
 * `null` means "All agents".
 */
export function useAgentParam(): [string | null, (agentId: string | null) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(AGENT_PARAM);
  const set = useCallback(
    (agentId: string | null) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (agentId) next.set(AGENT_PARAM, agentId);
          else next.delete(AGENT_PARAM);
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [value, set];
}
