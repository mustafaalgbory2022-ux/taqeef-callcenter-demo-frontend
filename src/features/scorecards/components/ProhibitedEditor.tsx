import { useI18n } from '@/shared/i18n/I18nProvider';
import type { MessageKey } from '@/shared/i18n/translate';
import type { ProhibitedExpression } from '@/shared/types/domain';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { newExpression } from '../model/draft';
import styles from './Editor.module.css';

export interface ProhibitedEditorProps {
  items: readonly ProhibitedExpression[];
  errors: Record<number, MessageKey>;
  onChange: (items: ProhibitedExpression[]) => void;
}

export function ProhibitedEditor({ items, errors, onChange }: ProhibitedEditorProps) {
  const { t } = useI18n();
  const update = (i: number, patch: Partial<ProhibitedExpression>) =>
    onChange(items.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const errorKey = (i: number) => errors[i];

  return (
    <section className={styles.section} aria-labelledby="prohibited-heading">
      <h3 className={styles.sectionTitle} id="prohibited-heading">
        {t('scorecards.prohibited.title')}
      </h3>
      <p className={styles.hint}>{t('scorecards.prohibited.hint')}</p>
      {items.map((p, i) => {
        const key = errorKey(i);
        return (
          <div key={p.id} className={styles.expression}>
            <Field
              label={t('scorecards.prohibited.phrase', { n: i + 1 })}
              error={key ? t(key) : undefined}
            >
              {(f) => (
                <input
                  {...f}
                  lang={p.language}
                  dir="auto"
                  value={p.phrase}
                  onChange={(e) => update(i, { phrase: e.target.value })}
                />
              )}
            </Field>
            <Field label={t('scorecards.prohibited.language')}>
              {(f) => (
                <select
                  {...f}
                  value={p.language}
                  onChange={(e) => update(i, { language: e.target.value === 'en' ? 'en' : 'ar' })}
                >
                  <option value="ar">{t('settings.language.ar')}</option>
                  <option value="en">{t('settings.language.en')}</option>
                </select>
              )}
            </Field>
            <Button
              variant="danger"
              size="sm"
              icon="close"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            >
              {t('scorecards.prohibited.remove')}
              <span className="visually-hidden"> {i + 1}</span>
            </Button>
          </div>
        );
      })}
      <div>
        <Button icon="plus" onClick={() => onChange([...items, newExpression(items)])}>
          {t('scorecards.prohibited.add')}
        </Button>
      </div>
    </section>
  );
}
