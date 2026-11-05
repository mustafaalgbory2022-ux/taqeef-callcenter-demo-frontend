import type { DashboardSummary } from '@/shared/types/domain';
import { isDisplayHundredths } from '@/shared/utils/score';
import {
  arrayOf,
  bool,
  DecodeError,
  nullable,
  num,
  object,
  oneOf,
  str,
  type Decoded,
  type Decoder,
} from '../decode';
import { utcTimestamp } from './common';
import { opaqueId } from './ids';

const count: Decoder<number> = (v, path = '') => {
  const n = num(v, path);
  if (!Number.isInteger(n) || n < 0) throw new DecodeError(path, 'a non-negative integer');
  return n;
};
const hundredths: Decoder<number> = (v, path = '') => {
  const n = num(v, path);
  if (!isDisplayHundredths(n)) throw new DecodeError(path, 'an integer 0–1000');
  return n;
};

/** `GET /api/dashboard` (contract v0.3 §11.4; field names as given, shape PROPOSED). */
export const wireDashboard = object({
  scope: oneOf(['all_versions', 'version']),
  scorecard_version_id: nullable(opaqueId),
  agent_id: nullable(opaqueId),
  agent_display_name: nullable(str),
  as_of: utcTimestamp,
  calls_total: count,
  outcomes: object({ scored: count, insufficient_evidence: count, not_assessable: count }),
  evaluation_failed: count,
  not_yet_evaluated: count,
  average: nullable(object({ display_hundredths: hundredths, based_on_n: count })),
  threshold: object({
    mode: oneOf(['single', 'mixed', 'none']),
    threshold_hundredths: nullable(hundredths),
    average_below_threshold: nullable(bool),
  }),
  below_threshold_count: count,
  criteria: arrayOf(
    object({
      criterion_id: str,
      criterion_version: count,
      name_en: str,
      name_ar: str,
      met: count,
      partially_met: count,
      not_met: count,
      not_assessable: count,
    }),
  ),
  prohibited_hits: object({ penalty: count, review_flag: count, none: count }),
});

/** §11.4 consistency rules; drift is a contract mismatch, never silently "fixed". */
function assertConsistent(w: Decoded<typeof wireDashboard>): void {
  const n = w.average?.based_on_n ?? 0;
  if (w.average !== null && w.average.based_on_n === 0) {
    throw new DecodeError('average', 'null when based_on_n is 0');
  }
  if (n !== w.outcomes.scored) throw new DecodeError('average.based_on_n', 'outcomes.scored');
  if ((w.threshold.mode === 'none') !== (n === 0)) {
    throw new DecodeError('threshold.mode', '"none" exactly when no scored run is selected');
  }
  const single = w.threshold.mode === 'single';
  if (single !== (w.threshold.threshold_hundredths !== null)) {
    throw new DecodeError('threshold.threshold_hundredths', 'a value exactly in "single" mode');
  }
  if (single !== (w.threshold.average_below_threshold !== null)) {
    throw new DecodeError('threshold.average_below_threshold', 'a value exactly in "single" mode');
  }
  if (w.below_threshold_count > w.outcomes.scored) {
    throw new DecodeError('below_threshold_count', 'at most outcomes.scored');
  }
  if ((w.scope === 'version') !== (w.scorecard_version_id !== null)) {
    throw new DecodeError('scorecard_version_id', 'a version id exactly in "version" scope');
  }
}

export function dashboardFromWire(w: Decoded<typeof wireDashboard>): DashboardSummary {
  assertConsistent(w);
  const t = w.threshold;
  return {
    scope: w.scope,
    scorecardVersionId: w.scorecard_version_id,
    agentId: w.agent_id,
    agentDisplayName: w.agent_display_name,
    asOf: w.as_of,
    callsTotal: w.calls_total,
    outcomes: {
      scored: w.outcomes.scored,
      insufficientEvidence: w.outcomes.insufficient_evidence,
      notAssessable: w.outcomes.not_assessable,
    },
    evaluationFailed: w.evaluation_failed,
    notYetEvaluated: w.not_yet_evaluated,
    average: w.average && {
      displayHundredths: w.average.display_hundredths,
      basedOnN: w.average.based_on_n,
    },
    threshold:
      t.mode === 'single' && t.threshold_hundredths !== null && t.average_below_threshold !== null
        ? {
            mode: 'single',
            thresholdHundredths: t.threshold_hundredths,
            averageBelowThreshold: t.average_below_threshold,
          }
        : {
            mode: t.mode === 'mixed' ? 'mixed' : 'none',
            thresholdHundredths: null,
            averageBelowThreshold: null,
          },
    belowThresholdCount: w.below_threshold_count,
    criteria: w.criteria.map((c) => ({
      criterionId: c.criterion_id,
      criterionVersion: c.criterion_version,
      name: { en: c.name_en, ar: c.name_ar },
      met: c.met,
      partiallyMet: c.partially_met,
      notMet: c.not_met,
      notAssessable: c.not_assessable,
    })),
    prohibitedHits: {
      penalty: w.prohibited_hits.penalty,
      reviewFlag: w.prohibited_hits.review_flag,
      none: w.prohibited_hits.none,
    },
  };
}
