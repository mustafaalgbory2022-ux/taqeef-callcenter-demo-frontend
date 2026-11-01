import type {
  CorrectionProposal,
  CorrectionReview,
  DictionaryCorrection,
  DictionaryEntry,
  DictionaryEntryInput,
  DictionaryEntryVersion,
} from '@/shared/types/domain';
import { arrayOf, bool, nullable, num, object, oneOf, str, type Decoded } from '../decode';

/* PROVISIONAL wire shapes for the Iraqi Arabic dictionary and supervised corrections. */

const KINDS = ['dialect_expression', 'spelling_variant', 'product_term'] as const;
const STATUS = ['active', 'disabled'] as const;

export const wireDictionaryEntry = object({
  id: str,
  kind: oneOf(KINDS),
  term: str,
  variants: arrayOf(str),
  standard: str,
  meaning_en: str,
  notes: str,
  status: oneOf(STATUS),
  version: num,
  updated_at: str,
  updated_by: str,
  synthetic: bool,
});

export function dictionaryEntryFromWire(w: Decoded<typeof wireDictionaryEntry>): DictionaryEntry {
  return {
    id: w.id,
    kind: w.kind,
    term: w.term,
    variants: w.variants,
    standard: w.standard,
    meaningEn: w.meaning_en,
    notes: w.notes,
    status: w.status,
    version: w.version,
    updatedAt: w.updated_at,
    updatedBy: w.updated_by,
    synthetic: w.synthetic,
  };
}

export function dictionaryInputToWire(i: Partial<DictionaryEntryInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (i.kind !== undefined) out.kind = i.kind;
  if (i.term !== undefined) out.term = i.term.trim();
  if (i.variants !== undefined) out.variants = i.variants.map((v) => v.trim()).filter(Boolean);
  if (i.standard !== undefined) out.standard = i.standard.trim();
  if (i.meaningEn !== undefined) out.meaning_en = i.meaningEn.trim();
  if (i.notes !== undefined) out.notes = i.notes.trim();
  if (i.changeNote !== undefined) out.change_note = i.changeNote.trim();
  return out;
}

export const wireDictionaryVersion = object({
  entry_id: str,
  version: num,
  action: oneOf(['created', 'updated', 'disabled', 'enabled']),
  kind: oneOf(KINDS),
  term: str,
  variants: arrayOf(str),
  standard: str,
  meaning_en: str,
  notes: str,
  status: oneOf(STATUS),
  change_note: str,
  changed_at: str,
  changed_by: str,
});

export function dictionaryVersionFromWire(
  w: Decoded<typeof wireDictionaryVersion>,
): DictionaryEntryVersion {
  return {
    entryId: w.entry_id,
    version: w.version,
    action: w.action,
    kind: w.kind,
    term: w.term,
    variants: w.variants,
    standard: w.standard,
    meaningEn: w.meaning_en,
    notes: w.notes,
    status: w.status,
    changeNote: w.change_note,
    changedAt: w.changed_at,
    changedBy: w.changed_by,
  };
}

export const wireCorrection = object({
  id: str,
  call_id: str,
  segment_id: nullable(str),
  heard: str,
  proposed: str,
  kind: oneOf(KINDS),
  proposed_by: str,
  proposed_at: str,
  status: oneOf(['pending', 'approved', 'rejected']),
  reviewed_by: nullable(str),
  reviewed_at: nullable(str),
  review_note: str,
  entry_id: nullable(str),
  synthetic: bool,
});

export function correctionFromWire(w: Decoded<typeof wireCorrection>): DictionaryCorrection {
  return {
    id: w.id,
    callId: w.call_id,
    segmentId: w.segment_id,
    heard: w.heard,
    proposed: w.proposed,
    kind: w.kind,
    proposedBy: w.proposed_by,
    proposedAt: w.proposed_at,
    status: w.status,
    reviewedBy: w.reviewed_by,
    reviewedAt: w.reviewed_at,
    reviewNote: w.review_note,
    entryId: w.entry_id,
    synthetic: w.synthetic,
  };
}

export const proposalToWire = (p: CorrectionProposal) => ({
  call_id: p.callId.trim(),
  segment_id: p.segmentId.trim() || null,
  heard: p.heard.trim(),
  proposed: p.proposed.trim(),
  kind: p.kind,
});

export const reviewToWire = (r: CorrectionReview) => ({
  decision: r.decision,
  note: r.note.trim(),
  add_to_dictionary: r.addToDictionary,
});
