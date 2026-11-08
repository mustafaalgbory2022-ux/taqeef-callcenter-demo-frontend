import type { Evaluation, ScorecardVersion } from '@/shared/types/domain';

/** The scorecard version a run was made with, by `scorecard_version_id` (contract v0.3 §7.3). */
export function versionOf(
  versions: readonly ScorecardVersion[],
  e: Pick<Evaluation, 'scorecardVersionId'>,
): ScorecardVersion | undefined {
  return versions.find((v) => v.scorecardVersionId === e.scorecardVersionId);
}
