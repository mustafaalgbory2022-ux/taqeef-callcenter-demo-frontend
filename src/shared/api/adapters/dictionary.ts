import type {
  CorrectionProposal,
  CorrectionReview,
  CorrectionStatus,
  DictionaryCorrection,
  DictionaryEntry,
  DictionaryEntryInput,
  DictionaryEntryVersion,
  DictionaryQuery,
  DictionaryStatus,
} from '@/shared/types/domain';
import { endpoints } from '../endpoints';
import { listOf, type Send } from '../send';
import {
  correctionFromWire,
  dictionaryEntryFromWire,
  dictionaryInputToWire,
  dictionaryVersionFromWire,
  proposalToWire,
  reviewToWire,
  wireCorrection,
  wireDictionaryEntry,
  wireDictionaryVersion,
} from '../wire/dictionary';

/**
 * Iraqi Arabic dictionary and supervised corrections (PROVISIONAL routes). Entries are never
 * deleted: edits and disabling add immutable versions. Reviews require a second person.
 */
export interface DictionaryApi {
  listEntries(query?: DictionaryQuery): Promise<DictionaryEntry[]>;
  createEntry(input: DictionaryEntryInput): Promise<DictionaryEntry>;
  updateEntry(id: string, input: DictionaryEntryInput): Promise<DictionaryEntry>;
  setEntryStatus(
    id: string,
    status: DictionaryStatus,
    changeNote: string,
  ): Promise<DictionaryEntry>;
  listVersions(id: string): Promise<DictionaryEntryVersion[]>;
  listCorrections(status?: CorrectionStatus): Promise<DictionaryCorrection[]>;
  proposeCorrection(p: CorrectionProposal): Promise<DictionaryCorrection>;
  reviewCorrection(id: string, review: CorrectionReview): Promise<DictionaryCorrection>;
}

export function createDictionaryApi(send: Send): DictionaryApi {
  const entries = listOf(wireDictionaryEntry, dictionaryEntryFromWire);
  const versions = listOf(wireDictionaryVersion, dictionaryVersionFromWire);
  const corrections = listOf(wireCorrection, correctionFromWire);
  return {
    listEntries: (q = {}) =>
      send(
        {
          method: 'GET',
          path: endpoints.dictionaryEntries,
          query: { search: q.search?.trim() || undefined, kind: q.kind, status: q.status },
        },
        entries.decoder,
        entries.map,
      ),
    createEntry: (input) =>
      send(
        { method: 'POST', path: endpoints.dictionaryEntries, body: dictionaryInputToWire(input) },
        wireDictionaryEntry,
        dictionaryEntryFromWire,
      ),
    updateEntry: (id, input) =>
      send(
        {
          method: 'PATCH',
          path: endpoints.dictionaryEntry(id),
          body: dictionaryInputToWire(input),
        },
        wireDictionaryEntry,
        dictionaryEntryFromWire,
      ),
    setEntryStatus: (id, status, changeNote) =>
      send(
        {
          method: 'PATCH',
          path: endpoints.dictionaryEntry(id),
          body: { status, change_note: changeNote.trim() },
        },
        wireDictionaryEntry,
        dictionaryEntryFromWire,
      ),
    listVersions: (id) =>
      send(
        { method: 'GET', path: endpoints.dictionaryVersions(id) },
        versions.decoder,
        versions.map,
      ),
    listCorrections: (status) =>
      send(
        { method: 'GET', path: endpoints.corrections, query: { status } },
        corrections.decoder,
        corrections.map,
      ),
    proposeCorrection: (p) =>
      send(
        { method: 'POST', path: endpoints.corrections, body: proposalToWire(p) },
        wireCorrection,
        correctionFromWire,
      ),
    reviewCorrection: (id, r) =>
      send(
        { method: 'POST', path: endpoints.correctionReview(id), body: reviewToWire(r) },
        wireCorrection,
        correctionFromWire,
      ),
  };
}
