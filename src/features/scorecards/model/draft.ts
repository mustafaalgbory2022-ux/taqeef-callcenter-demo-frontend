import type { MessageKey } from '@/shared/i18n/translate';
import type {
  Criterion,
  ProhibitedExpression,
  ScorecardDraft,
  ScorecardVersion,
} from '@/shared/types/domain';
import { isBlank } from '@/shared/utils/validation';

export const MAX_CRITERIA = 12;
export const MAX_POINTS = 10;
export const MAX_PENALTY_POINTS = 10;

export function toDraft(v: ScorecardVersion): ScorecardDraft {
  return {
    name: { ...v.name },
    lowScoreThreshold: v.lowScoreThreshold,
    minimumAssessablePoints: v.minimumAssessablePoints,
    criteria: v.criteria.map((c) => ({
      ...c,
      label: { ...c.label },
      description: { ...c.description },
    })),
    prohibitedExpressions: v.prohibitedExpressions.map((p) => ({ ...p })),
    prohibitedPenalty: { ...v.prohibitedPenalty },
    changeNote: '',
  };
}

export function isDirty(draft: ScorecardDraft, version: ScorecardVersion): boolean {
  // The change note is metadata about the save, not part of the configuration.
  return JSON.stringify({ ...draft, changeNote: '' }) !== JSON.stringify(toDraft(version));
}

export type CriterionErrors = Partial<Record<'labelEn' | 'labelAr' | 'points', MessageKey>>;

export interface DraftErrors {
  name?: MessageKey;
  threshold?: MessageKey;
  minimumAssessable?: MessageKey;
  penalty?: MessageKey;
  criteria?: MessageKey;
  criteriaRows: Record<number, CriterionErrors>;
  prohibitedRows: Record<number, MessageKey>;
  changeNote?: MessageKey;
}

export function validateDraft(d: ScorecardDraft): DraftErrors {
  const errors: DraftErrors = { criteriaRows: {}, prohibitedRows: {} };
  if (isBlank(d.name.en) || isBlank(d.name.ar)) errors.name = 'scorecards.errors.name';
  const t = d.lowScoreThreshold;
  // Two decimals at most, tolerant of binary floating point (e.g. 8.05 * 100 = 805.0000000000001).
  if (!Number.isFinite(t) || t < 0 || t > 10 || Math.abs(Math.round(t * 100) - t * 100) > 1e-6) {
    errors.threshold = 'scorecards.errors.threshold';
  }
  if (d.criteria.length < 1 || d.criteria.length > MAX_CRITERIA)
    errors.criteria = 'scorecards.errors.criteriaCount';
  d.criteria.forEach((c, i) => {
    const row: CriterionErrors = {};
    if (isBlank(c.label.en)) row.labelEn = 'scorecards.errors.label';
    if (isBlank(c.label.ar)) row.labelAr = 'scorecards.errors.label';
    if (!Number.isInteger(c.maxPoints) || c.maxPoints < 1 || c.maxPoints > MAX_POINTS) {
      row.points = 'scorecards.errors.points';
    }
    if (Object.keys(row).length) errors.criteriaRows[i] = row;
  });
  const total = totalPoints(d.criteria);
  const min = d.minimumAssessablePoints;
  if (!Number.isInteger(min) || min < 1 || min > total)
    errors.minimumAssessable = 'scorecards.errors.minimumAssessable';
  const rule = d.prohibitedPenalty;
  if (!Number.isInteger(rule.points) || rule.points < 0 || rule.points > MAX_PENALTY_POINTS) {
    errors.penalty = 'scorecards.errors.penaltyPoints';
  } else if (rule.points > 0) {
    const target = d.criteria.find((c) => c.id === rule.criterionId);
    if (!target) errors.penalty = 'scorecards.errors.penaltyCriterion';
    // A deduction from an all-or-nothing criterion would create an invalid partial award.
    else if (!target.allowPartialCredit) errors.penalty = 'scorecards.errors.penaltyPartialCredit';
  }
  const seen = new Set<string>();
  d.prohibitedExpressions.forEach((p, i) => {
    const key = p.phrase.trim().toLowerCase();
    if (!key) errors.prohibitedRows[i] = 'scorecards.errors.phraseEmpty';
    else if (seen.has(key)) errors.prohibitedRows[i] = 'scorecards.errors.phraseDuplicate';
    seen.add(key);
  });
  if (isBlank(d.changeNote)) errors.changeNote = 'scorecards.errors.changeNote';
  return errors;
}

export function hasDraftErrors(e: DraftErrors): boolean {
  return Boolean(
    e.name ||
    e.threshold ||
    e.minimumAssessable ||
    e.penalty ||
    e.criteria ||
    e.changeNote ||
    Object.keys(e.criteriaRows).length ||
    Object.keys(e.prohibitedRows).length,
  );
}

function uniqueId(prefix: string, taken: readonly string[]): string {
  let n = taken.length + 1;
  while (taken.includes(`${prefix}-${n}`)) n += 1;
  return `${prefix}-${n}`;
}

export function newCriterion(existing: readonly Criterion[]): Criterion {
  return {
    id: uniqueId(
      'c-custom',
      existing.map((c) => c.id),
    ),
    label: { en: '', ar: '' },
    description: { en: '', ar: '' },
    maxPoints: 1,
    allowPartialCredit: true,
  };
}

export function newExpression(existing: readonly ProhibitedExpression[]): ProhibitedExpression {
  return {
    id: uniqueId(
      'px-custom',
      existing.map((p) => p.id),
    ),
    phrase: '',
    language: 'ar',
  };
}

export function moveItem<T>(list: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(index, 1);
  if (item !== undefined) next.splice(target, 0, item);
  return next;
}

/** Total points available on the scorecard (the approved default card totals 10). */
export function totalPoints(criteria: readonly Criterion[]): number {
  return criteria.reduce(
    (sum, c) => sum + (Number.isFinite(c.maxPoints) && c.maxPoints > 0 ? c.maxPoints : 0),
    0,
  );
}

/** Number inputs: an empty field becomes NaN (rejected by validation), never 0. */
export function parseNumberInput(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value);
}

export function numberInputValue(value: number): string {
  return Number.isFinite(value) ? String(value) : '';
}
