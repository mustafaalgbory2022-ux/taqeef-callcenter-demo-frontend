import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import type { ScorecardDraft } from '@/shared/types/domain';

export const useScorecardVersions = () =>
  useApiQuery(['scorecards', 'versions'], (api) => api.listScorecardVersions());

export const useCurrentScorecard = () =>
  useApiQuery(['scorecards', 'current'], (api) => api.getCurrentScorecard());

export const useSaveScorecard = () =>
  useApiMutation((api, draft: ScorecardDraft) => api.saveScorecardVersion(draft), ['scorecards']);
