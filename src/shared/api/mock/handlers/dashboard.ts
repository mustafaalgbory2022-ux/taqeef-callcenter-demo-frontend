import { fail, ok, type Route } from '../router';
import type { MockState, WireEvaluation } from '../types';

/**
 * SIMULATED `GET /dashboard` (contract v0.3 §11): the server-side aggregation the frontend
 * displays as given. Rules simulated here:
 * - one selected run per call: the latest completed run (all versions) or the latest run of
 *   the selected version; no fallback to an older scored run (§11.1);
 * - average = exact mean of A/P over selected scored runs, truncated only for display;
 * - shared threshold → average low iff mean < t/1000 exactly; mixed → no classification
 *   (§11.2); low-score count = stored below_threshold flags.
 */
export function dashboardRoutes(state: MockState): Route[] {
  return [
    {
      method: 'GET',
      pattern: '/dashboard',
      handler: ({ query }) => {
        const scope = query.scope ?? 'all_versions';
        if (scope !== 'all_versions' && scope !== 'version') return fail(422, 'Invalid scope.');
        const versionId = scope === 'version' ? (query.scorecard_version_id ?? '') : null;
        const version =
          versionId === null
            ? null
            : state.scorecards.find((v) => v.scorecard_version_id === versionId);
        if (versionId !== null && !version) return fail(404, 'Unknown scorecard version.');
        const agentId = query.agent_id ?? null;
        const agent = agentId ? state.agents.find((a) => a.agent_id === agentId) : null;
        if (agentId && !agent) return fail(404, 'Unknown agent.');

        const calls = state.calls.filter((c) => !agentId || c.agent_id === agentId);
        const later = (a: WireEvaluation, b: WireEvaluation) =>
          Date.parse(a.created_at) > Date.parse(b.created_at) ||
          (a.created_at === b.created_at && a.id > b.id);
        const selected: WireEvaluation[] = [];
        for (const call of calls) {
          let pick: WireEvaluation | null = null;
          for (const e of state.evaluations) {
            if (e.call_id !== call.id) continue;
            if (version && e.scorecard_version !== version.version) continue;
            if (!pick || later(e, pick)) pick = e;
          }
          if (pick) selected.push(pick);
        }
        const scored = selected.filter((e) => e.outcome === 'scored');

        // Exact mean of A/P as a fraction num/den (BigInt), then display = floor(1000·mean).
        let num = 0n;
        let den = 1n;
        for (const e of scored) {
          const a = BigInt(e.points_awarded_sum);
          const p = BigInt(e.points_possible_sum);
          num = num * p + a * den;
          den = den * p;
        }
        const n = BigInt(scored.length);
        const thresholds = new Set(scored.map((e) => e.threshold_hundredths));
        const single = scored.length > 0 && thresholds.size === 1 ? [...thresholds][0] : undefined;
        const mode = scored.length === 0 ? 'none' : single != null ? 'single' : 'mixed';

        const newestFirst = [...state.scorecards].sort((a, b) => b.version - a.version);
        const criterionIds = new Set(
          selected.flatMap((e) => e.criteria.map((c) => c.criterion_id)),
        );
        const criteria = [...criterionIds].map((id) => {
          const def = newestFirst.flatMap((v) => v.criteria).find((c) => c.id === id);
          const results = selected.flatMap((e) => e.criteria.filter((c) => c.criterion_id === id));
          const countOf = (r: string) => results.filter((c) => c.result === r).length;
          return {
            criterion_id: id,
            criterion_version: 1,
            name_en: def?.label.en ?? id,
            name_ar: def?.label.ar ?? id,
            met: countOf('met'),
            partially_met: countOf('partially_met'),
            not_met: countOf('not_met'),
            not_assessable: countOf('not_assessable'),
          };
        });
        const hits = selected.flatMap((e) => e.prohibited_hits);

        return ok({
          scope,
          scorecard_version_id: versionId,
          agent_id: agentId,
          agent_display_name: agent?.display_name ?? null,
          as_of: new Date().toISOString(),
          calls_total: calls.length,
          outcomes: {
            scored: scored.length,
            insufficient_evidence: selected.filter((e) => e.outcome === 'insufficient_evidence')
              .length,
            not_assessable: selected.filter((e) => e.outcome === 'not_assessable').length,
          },
          evaluation_failed: 0, // the simulated pipeline never fails an evaluation
          not_yet_evaluated: calls.length - selected.length,
          average:
            scored.length === 0
              ? null
              : {
                  display_hundredths: Number((1000n * num) / (den * n)),
                  based_on_n: scored.length,
                },
          threshold:
            mode === 'single' && single != null
              ? {
                  mode,
                  threshold_hundredths: single,
                  // mean < t/1000  ⇔  1000·num < t·den·n  (exact; equality is not low)
                  average_below_threshold: 1000n * num < BigInt(single) * den * n,
                }
              : { mode, threshold_hundredths: null, average_below_threshold: null },
          below_threshold_count: scored.filter((e) => e.below_threshold === true).length,
          criteria,
          prohibited_hits: {
            penalty: hits.filter((h) => h.disposition === 'penalty_applied').length,
            review_flag: hits.filter((h) => h.disposition === 'flagged_for_review').length,
            none: 0,
          },
        });
      },
    },
  ];
}
