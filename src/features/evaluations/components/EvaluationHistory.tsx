import { useState } from 'react';
import { resultPresentation } from '../model/outcome';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Evaluation, ScorecardVersion } from '@/shared/types/domain';
import { Field } from '@/shared/ui/Field';
import { ComparisonTable } from './ComparisonTable';
import styles from './Evaluation.module.css';

/**
 * Immutable evaluation history for one call, with a selectable previous-vs-new comparison
 * (defaults to the latest evaluation against the one before it).
 */
export function EvaluationHistory({
  history,
  versions,
}: {
  history: readonly Evaluation[];
  versions: readonly ScorecardVersion[];
}) {
  const { t, fmt } = useI18n();
  const [afterId, setAfterId] = useState(history[0]?.id ?? '');
  const [beforeId, setBeforeId] = useState(history[1]?.id ?? '');
  const after = history.find((e) => e.id === afterId);
  const before = history.find((e) => e.id === beforeId);

  const label = (e: Evaluation) =>
    `${fmt.dateTime(e.createdAt)} · v${e.scorecardVersion} · ${t(`evaluations.trigger.${e.trigger}`)} · ${outcomeLabel(
      e,
    )}`;
  // Failed, not assessable and insufficient evidence stay distinct; no score is ever implied.
  function outcomeLabel(e: Evaluation): string {
    const kind = resultPresentation(e);
    if (kind === 'scored' && e.displayHundredths !== null)
      return `${fmt.hundredths(e.displayHundredths)} ${t('common.outOfTen')}`;
    return kind === 'not_assessable'
      ? t('evaluations.notAssessableOverall.title')
      : t('evaluations.insufficient.title');
  }

  if (history.length < 2) {
    return (
      <p className={`${styles.section} ${styles.rationale}`}>{t('evaluations.history.single')}</p>
    );
  }
  return (
    <div className={styles.section}>
      <div className={styles.pickers}>
        <Field label={t('evaluations.compare.before')}>
          {(p) => (
            <select {...p} value={beforeId} onChange={(e) => setBeforeId(e.target.value)}>
              {history.map((e) => (
                <option key={e.id} value={e.id}>
                  {label(e)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t('evaluations.compare.after')}>
          {(p) => (
            <select {...p} value={afterId} onChange={(e) => setAfterId(e.target.value)}>
              {history.map((e) => (
                <option key={e.id} value={e.id}>
                  {label(e)}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      {before && after && before.id !== after.id ? (
        <ComparisonTable before={before} after={after} versions={versions} />
      ) : (
        <p className={styles.rationale}>{t('evaluations.compare.pickTwo')}</p>
      )}
    </div>
  );
}
