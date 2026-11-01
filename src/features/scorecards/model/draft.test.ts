import { describe, expect, it } from 'vitest';
import type { ScorecardVersion } from '@/shared/types/domain';
import {
  hasDraftErrors,
  isDirty,
  moveItem,
  newCriterion,
  parseNumberInput,
  toDraft,
  validateDraft,
  weightShares,
} from './draft';

const version: ScorecardVersion = {
  scorecardId: 'sc',
  version: 1,
  name: { en: 'Card', ar: 'بطاقة' },
  lowScoreThreshold: 7,
  criteria: [
    { id: 'a', label: { en: 'A', ar: 'أ' }, description: { en: '', ar: '' }, weight: 1 },
    { id: 'b', label: { en: 'B', ar: 'ب' }, description: { en: '', ar: '' }, weight: 3 },
  ],
  prohibitedExpressions: [{ id: 'p', phrase: 'bad', language: 'en' }],
  createdAt: '',
  createdBy: '',
  changeNote: '',
};

describe('scorecard draft', () => {
  it('requires a change note before saving a new version', () => {
    const errors = validateDraft(toDraft(version));
    expect(errors.changeNote).toBe('scorecards.errors.changeNote');
    expect(hasDraftErrors(validateDraft({ ...toDraft(version), changeNote: 'Edit' }))).toBe(false);
  });

  it('validates threshold, weights, labels and duplicate expressions', () => {
    const draft = {
      ...toDraft(version),
      changeNote: 'x',
      lowScoreThreshold: 7.005,
      criteria: [{ ...newCriterion([]), weight: 1.5 }],
      prohibitedExpressions: [
        { id: '1', phrase: 'Bad', language: 'en' as const },
        { id: '2', phrase: 'bad ', language: 'en' as const },
      ],
    };
    const errors = validateDraft(draft);
    expect(errors.threshold).toBe('scorecards.errors.threshold');
    expect(errors.criteriaRows[0]).toEqual({
      labelEn: 'scorecards.errors.label',
      labelAr: 'scorecards.errors.label',
      weight: 'scorecards.errors.weight',
    });
    expect(errors.prohibitedRows).toEqual({ 1: 'scorecards.errors.phraseDuplicate' });
  });

  it('accepts every two-decimal threshold and rejects an empty field', () => {
    const base = { ...toDraft(version), changeNote: 'x' };
    for (const t of [5.1, 8.05, 8.3, 8.8, 8.95, 0, 10, 7]) {
      expect(validateDraft({ ...base, lowScoreThreshold: t }).threshold, String(t)).toBeUndefined();
    }
    expect(validateDraft({ ...base, lowScoreThreshold: parseNumberInput('') }).threshold).toBe(
      'scorecards.errors.threshold',
    );
  });

  it('detects changes but ignores the change note', () => {
    expect(isDirty({ ...toDraft(version), changeNote: 'note' }, version)).toBe(false);
    expect(isDirty({ ...toDraft(version), lowScoreThreshold: 6.5 }, version)).toBe(true);
  });

  it('reorders items and computes weight shares', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(weightShares(version.criteria)).toEqual([25, 75]);
  });
});
