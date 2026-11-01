import { useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '@/shared/api/errors';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { ScorecardDraft, ScorecardVersion } from '@/shared/types/domain';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { useSaveScorecard } from '../hooks/useScorecards';
import {
  hasDraftErrors,
  isDirty,
  numberInputValue,
  parseNumberInput,
  toDraft,
  validateDraft,
  type DraftErrors,
} from '../model/draft';
import { CriteriaEditor } from './CriteriaEditor';
import { ProhibitedEditor } from './ProhibitedEditor';
import styles from './Editor.module.css';

const NO_ERRORS: DraftErrors = { criteriaRows: {}, prohibitedRows: {} };

/** Edits produce a NEW immutable version; existing evaluations keep their version. */
export function ScorecardEditor({ current }: { current: ScorecardVersion }) {
  const { t } = useI18n();
  const toast = useToast();
  const save = useSaveScorecard();
  const [draft, setDraft] = useState<ScorecardDraft>(() => toDraft(current));
  const [errors, setErrors] = useState<DraftErrors>(NO_ERRORS);
  const [serverError, setServerError] = useState<string | null>(null);
  const dirty = useMemo(() => isDirty(draft, current), [draft, current]);
  const set = <K extends keyof ScorecardDraft>(k: K, v: ScorecardDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const found = validateDraft(draft);
    setErrors(found);
    if (hasDraftErrors(found)) {
      toast('error', t('scorecards.errors.fix'));
      return;
    }
    try {
      const saved = await save.mutate(draft);
      toast('success', t('scorecards.saved', { version: saved.version }));
      setDraft(toDraft(saved));
      setErrors(NO_ERRORS);
    } catch (err) {
      const messages = err instanceof ApiError ? err.fieldIssues.map((i) => i.message) : [];
      setServerError(messages.length ? messages.join(' ') : describeError(err, t));
    }
  }

  return (
    <form className={styles.editor} onSubmit={submit} noValidate>
      <section className={styles.section} aria-labelledby="general-heading">
        <h3 className={styles.sectionTitle} id="general-heading">
          {t('scorecards.general.title')}
        </h3>
        <div className={styles.grid}>
          <Field
            label={t('scorecards.general.nameEn')}
            required
            error={errors.name ? t(errors.name) : undefined}
          >
            {(p) => (
              <input
                {...p}
                lang="en"
                dir="ltr"
                value={draft.name.en}
                onChange={(e) => set('name', { ...draft.name, en: e.target.value })}
              />
            )}
          </Field>
          <Field
            label={t('scorecards.general.nameAr')}
            required
            error={errors.name ? t(errors.name) : undefined}
          >
            {(p) => (
              <input
                {...p}
                lang="ar"
                dir="rtl"
                value={draft.name.ar}
                onChange={(e) => set('name', { ...draft.name, ar: e.target.value })}
              />
            )}
          </Field>
          <Field
            label={t('scorecards.general.threshold')}
            hint={t('scorecards.general.thresholdHint')}
            required
            error={errors.threshold ? t(errors.threshold) : undefined}
          >
            {(p) => (
              <input
                {...p}
                type="number"
                inputMode="decimal"
                min={0}
                max={10}
                step={0.01}
                value={numberInputValue(draft.lowScoreThreshold)}
                onChange={(e) => set('lowScoreThreshold', parseNumberInput(e.target.value))}
              />
            )}
          </Field>
        </div>
      </section>

      <CriteriaEditor
        criteria={draft.criteria}
        errors={errors.criteriaRows}
        listError={errors.criteria ? t(errors.criteria) : undefined}
        onChange={(c) => set('criteria', c)}
      />
      <ProhibitedEditor
        items={draft.prohibitedExpressions}
        errors={errors.prohibitedRows}
        onChange={(p) => set('prohibitedExpressions', p)}
      />

      <div className={styles.saveBar}>
        <Field
          label={t('scorecards.save.note')}
          hint={t('scorecards.save.noteHint')}
          required
          error={errors.changeNote ? t(errors.changeNote) : undefined}
        >
          {(p) => (
            <textarea
              {...p}
              value={draft.changeNote}
              maxLength={300}
              onChange={(e) => set('changeNote', e.target.value)}
            />
          )}
        </Field>
        {serverError && <Notice tone="danger" title={serverError} />}
        <Notice tone="info">{t('scorecards.save.immutable', { next: current.version + 1 })}</Notice>
        <div className={styles.saveActions}>
          <Button variant="primary" type="submit" loading={save.isPending} disabled={!dirty}>
            {t('scorecards.save.submit', { next: current.version + 1 })}
          </Button>
          <Button
            disabled={!dirty}
            onClick={() => {
              setDraft(toDraft(current));
              setErrors(NO_ERRORS);
            }}
          >
            {t('scorecards.save.discard')}
          </Button>
          {dirty && <span className={styles.dirty}>{t('scorecards.save.unsaved')}</span>}
        </div>
      </div>
    </form>
  );
}
