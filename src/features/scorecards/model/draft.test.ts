import { describe, expect, it } from 'vitest';
import type { ScorecardVersion } from '@/shared/types/domain';
import {
  hasDraftErrors,
  isDirty,
  moveItem,
  newCriterion,
  parseNumberInput,
  toDraft,
  totalPoints,
  validateDraft,
} from './draft';

const criterion = (id: string, maxPoints: number) => ({
  id,
  label: { en: id, ar: id },
  description: { en: '', ar: '' },
  maxPoints,
  allowPartialCredit: true,
});

/** Approved default card: 1 + 1 + 2 + 3 + 2 + 1 = 10 points, minimum 6 assessable. */
const version: ScorecardVersion = {
  scorecardVersionId: 'scv-1',
  status: 'active',
  scorecardId: 'sc',
  version: 1,
  name: { en: 'Card', ar: 'بطاقة' },
  lowScoreThreshold: 7,
  minimumAssessablePoints: 6,
  criteria: [
    criterion('greeting', 1),
    criterion('verification', 1),
    criterion('needs', 2),
    criterion('resolution', 3),
    criterion('language', 2),
    criterion('closing', 1),
  ],
  prohibitedExpressions: [{ id: 'p', phrase: 'bad', language: 'en' }],
  prohibitedPenalty: { points: 0, criterionId: null },
  createdAt: '',
  createdBy: '',
  changeNote: '',
};

describe('scorecard draft', () => {
  it('totals the approved card at 10 points', () => {
    expect(totalPoints(version.criteria)).toBe(10);
  });

  it('requires a change note before saving a new version', () => {
    expect(validateDraft(toDraft(version)).changeNote).toBe('scorecards.errors.changeNote');
    expect(hasDraftErrors(validateDraft({ ...toDraft(version), changeNote: 'Edit' }))).toBe(false);
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

  it('validates points, minimum assessable points and the penalty rule', () => {
    const base = { ...toDraft(version), changeNote: 'x' };
    expect(
      validateDraft({ ...base, criteria: [{ ...newCriterion([]), maxPoints: 1.5 }] })
        .criteriaRows[0],
    ).toEqual({
      labelEn: 'scorecards.errors.label',
      labelAr: 'scorecards.errors.label',
      points: 'scorecards.errors.points',
    });
    expect(validateDraft({ ...base, minimumAssessablePoints: 11 }).minimumAssessable).toBe(
      'scorecards.errors.minimumAssessable',
    );
    expect(
      validateDraft({ ...base, minimumAssessablePoints: 10 }).minimumAssessable,
    ).toBeUndefined();
    expect(
      validateDraft({ ...base, prohibitedPenalty: { points: 1, criterionId: null } }).penalty,
    ).toBe('scorecards.errors.penaltyCriterion');
    expect(
      validateDraft({ ...base, prohibitedPenalty: { points: 1, criterionId: 'language' } }).penalty,
    ).toBeUndefined();
  });

  it('only lets a penalty target a criterion that allows partial credit', () => {
    const base = { ...toDraft(version), changeNote: 'x' };
    const allOrNothing = base.criteria.map((c) =>
      c.id === 'language' ? { ...c, allowPartialCredit: false } : c,
    );
    const draft = {
      ...base,
      criteria: allOrNothing,
      prohibitedPenalty: { points: 1, criterionId: 'language' },
    };
    expect(validateDraft(draft).penalty).toBe('scorecards.errors.penaltyPartialCredit');
  });

  it('rejects duplicate prohibited expressions', () => {
    const draft = {
      ...toDraft(version),
      changeNote: 'x',
      prohibitedExpressions: [
        { id: '1', phrase: 'Bad', language: 'en' as const },
        { id: '2', phrase: 'bad ', language: 'en' as const },
      ],
    };
    expect(validateDraft(draft).prohibitedRows).toEqual({ 1: 'scorecards.errors.phraseDuplicate' });
  });

  it('detects changes but ignores the change note', () => {
    expect(isDirty({ ...toDraft(version), changeNote: 'note' }, version)).toBe(false);
    expect(isDirty({ ...toDraft(version), minimumAssessablePoints: 5 }, version)).toBe(true);
  });

  it('reorders items', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
  });
});
