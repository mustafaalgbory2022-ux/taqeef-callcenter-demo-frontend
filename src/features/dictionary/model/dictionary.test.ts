import { describe, expect, it } from 'vitest';
import type { DictionaryCorrection, DictionaryEntry } from '@/shared/types/domain';
import { emptyEntryInput, reviewBlock, validateEntry } from './dictionary';

const entry = (id: string, term: string, variants: string[] = []): DictionaryEntry => ({
  id,
  kind: 'dialect_expression',
  term,
  variants,
  standard: 'x',
  meaningEn: '',
  notes: '',
  status: 'active',
  version: 1,
  updatedAt: '',
  updatedBy: '',
  synthetic: true,
});
const entries = [entry('a', 'هسه', ['هسا']), entry('b', 'شلونك')];

describe('dictionary rules', () => {
  it('requires Arabic script, a standard form and a change note', () => {
    const input = { ...emptyEntryInput(), term: 'hello' };
    expect(validateEntry(input, entries, null)).toEqual({
      term: 'dictionary.errors.arabicRequired',
      standard: 'dictionary.errors.required',
      changeNote: 'dictionary.errors.required',
    });
    expect(
      validateEntry(
        { ...input, kind: 'product_term', standard: 'p', changeNote: 'new' },
        entries,
        null,
      ),
    ).toEqual({});
  });

  it('detects duplicates and conflicting variants by normalized form', () => {
    const base = { ...emptyEntryInput(), standard: 'الآن', changeNote: 'add' };
    expect(validateEntry({ ...base, term: 'هسة' }, entries, null).term).toBe(
      'dictionary.errors.duplicate',
    );
    expect(validateEntry({ ...base, term: 'هسا' }, entries, null).term).toBe(
      'dictionary.errors.variantConflict',
    );
    expect(
      validateEntry({ ...base, term: 'توه', variants: ['تَوّه'] }, entries, null).variants,
    ).toBe('dictionary.errors.variantSameAsTerm');
    expect(validateEntry({ ...base, term: 'هسه', variants: ['هسع'] }, entries, 'a')).toEqual({});
  });

  it('enforces the four-eyes review rule', () => {
    const c = { status: 'pending', proposedBy: 'Supervisor' } as DictionaryCorrection;
    expect(reviewBlock(c, 'Admin', true)).toBeNull();
    expect(reviewBlock(c, 'Supervisor', true)).toBe('own');
    expect(reviewBlock(c, 'Admin', false)).toBe('permission');
    expect(reviewBlock({ ...c, status: 'approved' }, 'Admin', true)).toBe('reviewed');
  });
});
