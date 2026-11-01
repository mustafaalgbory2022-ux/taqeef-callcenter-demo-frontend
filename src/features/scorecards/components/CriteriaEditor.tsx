import { useI18n } from '@/shared/i18n/I18nProvider';
import type { MessageKey } from '@/shared/i18n/translate';
import type { Criterion } from '@/shared/types/domain';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import {
  MAX_CRITERIA,
  MAX_WEIGHT,
  moveItem,
  newCriterion,
  numberInputValue,
  parseNumberInput,
  weightShares,
  type CriterionErrors,
} from '../model/draft';
import styles from './Editor.module.css';

export interface CriteriaEditorProps {
  criteria: readonly Criterion[];
  errors: Record<number, CriterionErrors>;
  listError?: string | undefined;
  onChange: (criteria: Criterion[]) => void;
}

export function CriteriaEditor({ criteria, errors, listError, onChange }: CriteriaEditorProps) {
  const { t, fmt } = useI18n();
  const shares = weightShares(criteria);
  const update = (i: number, patch: Partial<Criterion>) =>
    onChange(criteria.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const err = (key: MessageKey | undefined) => (key ? t(key) : undefined);

  return (
    <section className={styles.section} aria-labelledby="criteria-heading">
      <h3 className={styles.sectionTitle} id="criteria-heading">
        {t('scorecards.criteria.title', { n: fmt.integer(criteria.length) })}
      </h3>
      <p className={styles.hint}>{t('scorecards.criteria.rule')}</p>
      {listError && (
        <p className={styles.dirty} role="alert">
          {listError}
        </p>
      )}
      {criteria.map((c, i) => (
        <fieldset key={c.id} className={styles.item}>
          <legend>{t('scorecards.criteria.item', { n: i + 1 })}</legend>
          <div className={styles.grid}>
            <Field
              label={t('scorecards.criteria.labelEn')}
              required
              error={err(errors[i]?.labelEn)}
            >
              {(p) => (
                <input
                  {...p}
                  lang="en"
                  dir="ltr"
                  value={c.label.en}
                  onChange={(e) => update(i, { label: { ...c.label, en: e.target.value } })}
                />
              )}
            </Field>
            <Field
              label={t('scorecards.criteria.labelAr')}
              required
              error={err(errors[i]?.labelAr)}
            >
              {(p) => (
                <input
                  {...p}
                  lang="ar"
                  dir="rtl"
                  value={c.label.ar}
                  onChange={(e) => update(i, { label: { ...c.label, ar: e.target.value } })}
                />
              )}
            </Field>
            <Field
              label={t('scorecards.criteria.weight')}
              hint={t('scorecards.criteria.weightHint', { max: MAX_WEIGHT })}
              required
              error={err(errors[i]?.weight)}
            >
              {(p) => (
                <input
                  {...p}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_WEIGHT}
                  step={1}
                  value={numberInputValue(c.weight)}
                  onChange={(e) => update(i, { weight: parseNumberInput(e.target.value) })}
                />
              )}
            </Field>
          </div>
          <div className={styles.grid}>
            <Field label={t('scorecards.criteria.descriptionEn')}>
              {(p) => (
                <textarea
                  {...p}
                  lang="en"
                  dir="ltr"
                  value={c.description.en}
                  onChange={(e) =>
                    update(i, { description: { ...c.description, en: e.target.value } })
                  }
                />
              )}
            </Field>
            <Field label={t('scorecards.criteria.descriptionAr')}>
              {(p) => (
                <textarea
                  {...p}
                  lang="ar"
                  dir="rtl"
                  value={c.description.ar}
                  onChange={(e) =>
                    update(i, { description: { ...c.description, ar: e.target.value } })
                  }
                />
              )}
            </Field>
          </div>
          <div className={styles.itemActions}>
            <Button
              size="sm"
              variant="ghost"
              icon="arrowUp"
              disabled={i === 0}
              onClick={() => onChange(moveItem(criteria, i, -1))}
            >
              {t('scorecards.criteria.moveUp')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon="arrowDown"
              disabled={i === criteria.length - 1}
              onClick={() => onChange(moveItem(criteria, i, 1))}
            >
              {t('scorecards.criteria.moveDown')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon="close"
              disabled={criteria.length <= 1}
              onClick={() => onChange(criteria.filter((_, idx) => idx !== i))}
            >
              {t('scorecards.criteria.remove')}
            </Button>
            <span className={styles.share}>
              {t('scorecards.criteria.share', { pct: fmt.integer(Math.round(shares[i] ?? 0)) })}
            </span>
          </div>
        </fieldset>
      ))}
      <div>
        <Button
          icon="plus"
          disabled={criteria.length >= MAX_CRITERIA}
          onClick={() => onChange([...criteria, newCriterion(criteria)])}
        >
          {t('scorecards.criteria.add')}
        </Button>
      </div>
    </section>
  );
}
