import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import type {
  CorrectionProposal,
  CorrectionReview,
  CorrectionStatus,
  DictionaryEntryInput,
  DictionaryQuery,
  DictionaryStatus,
} from '@/shared/types/domain';

export const useDictionaryEntries = (q: DictionaryQuery) =>
  useApiQuery(['dictionary', 'entries', q], (api) => api.dictionary.listEntries(q));
/** Unfiltered list used for client-side duplicate checks. */
export const useAllEntries = () =>
  useApiQuery(['dictionary', 'entries', 'all'], (api) => api.dictionary.listEntries());
export const useEntryVersions = (id: string) =>
  useApiQuery(['dictionary', 'versions', id], (api) => api.dictionary.listVersions(id));
export const useCorrections = (status: CorrectionStatus | undefined) =>
  useApiQuery(['dictionary', 'corrections', status ?? 'all'], (api) =>
    api.dictionary.listCorrections(status),
  );

const AFFECTED = ['dictionary'] as const;

export const useSaveEntry = () =>
  useApiMutation(
    (api, a: { id: string | null; input: DictionaryEntryInput }) =>
      a.id ? api.dictionary.updateEntry(a.id, a.input) : api.dictionary.createEntry(a.input),
    AFFECTED,
  );
export const useSetEntryStatus = () =>
  useApiMutation(
    (api, a: { id: string; status: DictionaryStatus; note: string }) =>
      api.dictionary.setEntryStatus(a.id, a.status, a.note),
    AFFECTED,
  );
export const useProposeCorrection = () =>
  useApiMutation((api, p: CorrectionProposal) => api.dictionary.proposeCorrection(p), AFFECTED);
export const useReviewCorrection = () =>
  useApiMutation(
    (api, a: { id: string; review: CorrectionReview }) =>
      api.dictionary.reviewCorrection(a.id, a.review),
    AFFECTED,
  );
