import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Criterion, ProhibitedPenaltyRule } from '@/shared/types/domain';
import { Field } from '@/shared/ui/Field';
import { MAX_PENALTY_POINTS, numberInputValue, parseNumberInput } from '../model/draft';
import styles from './Editor.module.css';

/**
 * The only way prohibited expressions can affect scores. 0 points = flag for review only.
 * Even with points > 0, a penalty applies only to hits reliably attributed to the agent.
 */
export function PenaltyRuleEditor({
  rule,
  criteria,
  error,
  onChange,
}: {
  rule: ProhibitedPenaltyRule;
  criteria: readonly Criterion[];
  error?: string | undefined;
  onChange: (rule: ProhibitedPenaltyRule) => void;
}) {
  const { t, pick } = useI18n();
  return (
    <section className={styles.section} aria-labelledby="penalty-heading">
      <h3 className={styles.sectionTitle} id="penalty-heading">
        {t('scorecards.penalty.title')}
      </h3>
      <p className={styles.hint}>{t('scorecards.penalty.note')}</p>
      <div className={styles.grid}>
        <Field
          label={t('scorecards.penalty.points')}
          hint={t('scorecards.penalty.pointsHint')}
          error={error}
        >
          {(p) => (
            <input
              {...p}
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_PENALTY_POINTS}
              step={1}
              value={numberInputValue(rule.points)}
              onChange={(e) => onChange({ ...rule, points: parseNumberInput(e.target.value) })}
            />
          )}
        </Field>
        <Field label={t('scorecards.penalty.criterion')}>
          {(p) => (
            <select
              {...p}
              value={rule.criterionId ?? ''}
              disabled={!(rule.points > 0)}
              onChange={(e) => onChange({ ...rule, criterionId: e.target.value || null })}
            >
              <option value="">{t('scorecards.penalty.selectCriterion')}</option>
              {criteria.map((c) => (
                <option key={c.id} value={c.id}>
                  {pick(c.label) || c.id}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
    </section>
  );
}
