import type { DictionaryKind } from '@/shared/types/domain';
import { ARABIC_LETTER, normalizeTerm } from './arabic';

export type DictionaryIssue =
  | 'required'
  | 'too_long'
  | 'arabic_required'
  | 'duplicate'
  | 'variant_same_as_term'
  | 'variant_conflict'
  | 'too_many';

export type DictionaryRuleField =
  'term' | 'variants' | 'standard' | 'meaningEn' | 'notes' | 'changeNote';

export interface DictionaryRuleInput {
  kind: DictionaryKind;
  term: string;
  variants: readonly string[];
  standard: string;
  meaningEn: string;
  notes: string;
  changeNote: string;
}

export interface ExistingTerm {
  id: string;
  kind: DictionaryKind;
  term: string;
  variants: readonly string[];
}

export const MAX_VARIANTS = 20;

/**
 * Dictionary validation shared by the form and the simulated backend. Terms are compared by
 * their normalized form (diacritics, alef/taa marbuta forms and spacing ignored).
 */
export function dictionaryIssues(
  input: DictionaryRuleInput,
  existing: readonly ExistingTerm[],
  selfId: string | null,
): Partial<Record<DictionaryRuleField, DictionaryIssue>> {
  const issues: Partial<Record<DictionaryRuleField, DictionaryIssue>> = {};
  const term = input.term.trim();
  const key = normalizeTerm(term);
  const others = existing.filter((e) => e.id !== selfId && e.kind === input.kind);
  if (!term) issues.term = 'required';
  else if (term.length > 60) issues.term = 'too_long';
  else if (input.kind !== 'product_term' && !ARABIC_LETTER.test(term))
    issues.term = 'arabic_required';
  else if (others.some((e) => normalizeTerm(e.term) === key)) issues.term = 'duplicate';
  else if (others.some((e) => e.variants.some((v) => normalizeTerm(v) === key)))
    issues.term = 'variant_conflict';

  if (input.variants.length > MAX_VARIANTS) issues.variants = 'too_many';
  else if (input.variants.some((v) => v.trim().length > 60)) issues.variants = 'too_long';
  else if (term && input.variants.some((v) => normalizeTerm(v) === key))
    issues.variants = 'variant_same_as_term';
  else if (
    input.variants.some((v) =>
      others.some(
        (e) =>
          normalizeTerm(e.term) === normalizeTerm(v) ||
          e.variants.some((x) => normalizeTerm(x) === normalizeTerm(v)),
      ),
    )
  )
    issues.variants = 'variant_conflict';

  if (!input.standard.trim()) issues.standard = 'required';
  else if (input.standard.trim().length > 80) issues.standard = 'too_long';
  if (input.meaningEn.trim().length > 120) issues.meaningEn = 'too_long';
  if (input.notes.trim().length > 300) issues.notes = 'too_long';
  if (input.changeNote.trim().length < 3) issues.changeNote = 'required';
  return issues;
}
