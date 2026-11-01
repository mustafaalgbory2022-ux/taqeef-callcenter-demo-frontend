import { useState, type FormEvent } from 'react';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { DictionaryEntry, DictionaryEntryInput, DictionaryKind } from '@/shared/types/domain';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { splitList } from '@/shared/utils/arabic';
import { useSaveEntry } from '../hooks/useDictionary';
import {
  DICTIONARY_KINDS,
  emptyEntryInput,
  ENTRY_SERVER_FIELD,
  toEntryInput,
  validateEntry,
  type EntryField,
} from '../model/dictionary';

export function EntryFormDialog({
  entry,
  entries,
  onClose,
}: {
  entry: DictionaryEntry | null;
  entries: readonly DictionaryEntry[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const save = useSaveEntry();
  const [values, setValues] = useState<DictionaryEntryInput>(
    entry ? toEntryInput(entry) : emptyEntryInput(),
  );
  const [variantsText, setVariantsText] = useState(values.variants.join('، '));
  const [errors, setErrors] = useState<Partial<Record<EntryField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = <K extends keyof DictionaryEntryInput>(k: K, v: DictionaryEntryInput[K]) =>
    setValues((x) => ({ ...x, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const input = { ...values, variants: splitList(variantsText) };
    const client = validateEntry(input, entries, entry?.id ?? null);
    setErrors(Object.fromEntries(Object.entries(client).map(([k, key]) => [k, t(key)])));
    if (Object.keys(client).length > 0) return;
    try {
      const saved = await save.mutate({ id: entry?.id ?? null, input });
      toast(
        'success',
        t(entry ? 'dictionary.form.updated' : 'dictionary.form.created', {
          term: saved.term,
          v: saved.version,
        }),
      );
      onClose();
    } catch (err) {
      const mapped = mapFieldIssues(err, ENTRY_SERVER_FIELD);
      if (mapped) setErrors(mapped.fields);
      if (!mapped || mapped.unmapped.length > 0)
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
    }
  }

  const formId = 'dictionary-entry-form';
  return (
    <Dialog
      open
      title={
        entry
          ? t('dictionary.form.editTitle', { term: entry.term })
          : t('dictionary.form.createTitle')
      }
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit" form={formId} loading={save.isPending}>
            {entry ? t('dictionary.form.saveVersion', { v: entry.version + 1 }) : t('common.save')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className={layout.form}>
        <div className={layout.row}>
          <Field label={t('dictionary.fields.kind')} required>
            {(p) => (
              <select
                {...p}
                value={values.kind}
                onChange={(e) => set('kind', e.target.value as DictionaryKind)}
              >
                {DICTIONARY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`dictionary.kinds.${k}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field
            label={t('dictionary.fields.term')}
            hint={t('dictionary.form.termHint')}
            required
            error={errors.term}
          >
            {(p) => (
              <input
                {...p}
                dir="auto"
                lang="ar"
                maxLength={60}
                value={values.term}
                onChange={(e) => set('term', e.target.value)}
              />
            )}
          </Field>
          <Field
            label={t('dictionary.fields.standard')}
            hint={t('dictionary.form.standardHint')}
            required
            error={errors.standard}
          >
            {(p) => (
              <input
                {...p}
                dir="auto"
                lang="ar"
                maxLength={80}
                value={values.standard}
                onChange={(e) => set('standard', e.target.value)}
              />
            )}
          </Field>
        </div>
        <Field
          label={t('dictionary.fields.variants')}
          hint={t('dictionary.form.variantsHint')}
          error={errors.variants}
        >
          {(p) => (
            <textarea
              {...p}
              dir="auto"
              lang="ar"
              rows={2}
              value={variantsText}
              onChange={(e) => setVariantsText(e.target.value)}
            />
          )}
        </Field>
        <div className={layout.row}>
          <Field label={t('dictionary.fields.meaningEn')} error={errors.meaningEn}>
            {(p) => (
              <input
                {...p}
                dir="ltr"
                lang="en"
                maxLength={120}
                value={values.meaningEn}
                onChange={(e) => set('meaningEn', e.target.value)}
              />
            )}
          </Field>
          <Field label={t('dictionary.fields.notes')} error={errors.notes}>
            {(p) => (
              <input
                {...p}
                dir="auto"
                maxLength={300}
                value={values.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            )}
          </Field>
        </div>
        <Field label={t('dictionary.fields.changeNote')} required error={errors.changeNote}>
          {(p) => (
            <input
              {...p}
              maxLength={200}
              value={values.changeNote}
              onChange={(e) => set('changeNote', e.target.value)}
            />
          )}
        </Field>
      </form>
      {formError && <Notice tone="danger" title={formError} />}
      <Notice tone="mock">{t('dictionary.syntheticNote')}</Notice>
    </Dialog>
  );
}
