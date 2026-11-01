import type { MessageKey } from '@/shared/i18n/translate';
import type {
  DictionaryCorrection,
  DictionaryEntry,
  DictionaryEntryInput,
  DictionaryKind,
} from '@/shared/types/domain';
import {
  dictionaryIssues,
  type DictionaryIssue,
  type DictionaryRuleField,
} from '@/shared/utils/dictionaryRules';

export const DICTIONARY_KINDS: readonly DictionaryKind[] = [
  'dialect_expression',
  'spelling_variant',
  'product_term',
];

export type EntryField = DictionaryRuleField;
export type EntryErrors = Partial<Record<EntryField, MessageKey>>;

const ISSUE_KEYS: Record<DictionaryIssue, MessageKey> = {
  required: 'dictionary.errors.required',
  too_long: 'dictionary.errors.tooLong',
  arabic_required: 'dictionary.errors.arabicRequired',
  duplicate: 'dictionary.errors.duplicate',
  variant_same_as_term: 'dictionary.errors.variantSameAsTerm',
  variant_conflict: 'dictionary.errors.variantConflict',
  too_many: 'dictionary.errors.tooManyVariants',
};

export const emptyEntryInput = (
  kind: DictionaryKind = 'dialect_expression',
): DictionaryEntryInput => ({
  kind,
  term: '',
  variants: [],
  standard: '',
  meaningEn: '',
  notes: '',
  changeNote: '',
});

export function toEntryInput(e: DictionaryEntry): DictionaryEntryInput {
  return {
    kind: e.kind,
    term: e.term,
    variants: e.variants,
    standard: e.standard,
    meaningEn: e.meaningEn,
    notes: e.notes,
    changeNote: '',
  };
}

/** Same rules as the server (shared), returned as i18n keys. */
export function validateEntry(
  input: DictionaryEntryInput,
  entries: readonly DictionaryEntry[],
  selfId: string | null,
): EntryErrors {
  const issues = dictionaryIssues(input, entries, selfId);
  return Object.fromEntries(
    Object.entries(issues).map(([field, issue]) => [field, ISSUE_KEYS[issue]]),
  ) as EntryErrors;
}

export const ENTRY_SERVER_FIELD: Record<string, EntryField> = {
  term: 'term',
  variants: 'variants',
  standard: 'standard',
  meaning_en: 'meaningEn',
  notes: 'notes',
  change_note: 'changeNote',
};

export type ReviewBlock = 'reviewed' | 'own' | 'permission' | null;

/** Why the current user may not review a correction (four-eyes rule), or null if they may. */
export function reviewBlock(
  c: DictionaryCorrection,
  userName: string,
  canReview: boolean,
): ReviewBlock {
  if (c.status !== 'pending') return 'reviewed';
  if (!canReview) return 'permission';
  if (c.proposedBy === userName) return 'own';
  return null;
}
