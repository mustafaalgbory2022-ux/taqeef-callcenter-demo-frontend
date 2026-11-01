import type { Evaluation, ScorecardVersion } from '@/shared/types/domain';

export function versionOf(
  versions: readonly ScorecardVersion[],
  e: Pick<Evaluation, 'scorecardId' | 'scorecardVersion'>,
): ScorecardVersion | undefined {
  return versions.find((v) => v.scorecardId === e.scorecardId && v.version === e.scorecardVersion);
}
