import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Evaluation, ScorecardVersion } from '@/shared/types/domain';
import { Icon } from '@/shared/ui/Icon';
import { formatDuration } from '@/shared/utils/time';
import { ResultValue } from './ResultValue';
import styles from './Evaluation.module.css';

export interface CriterionResultsProps {
  evaluation: Evaluation;
  version: ScorecardVersion | undefined;
  onEvidence: (startMs: number, segmentIds: readonly string[]) => void;
}

/** Criterion-level results with rationale and evidence that seeks the recording. */
export function CriterionResults({ evaluation, version, onEvidence }: CriterionResultsProps) {
  const { t, pick } = useI18n();
  const labelOf = (id: string) => {
    const c = version?.criteria.find((x) => x.id === id);
    return c ? pick(c.label) : id;
  };
  return (
    <ul className={styles.list} aria-label={t('evaluations.criteria')}>
      {evaluation.criteria.map((c) => (
        <li
          key={c.criterionId}
          className={styles.criterion}
          data-testid={`criterion-${c.criterionId}`}
        >
          <div className={styles.criterionHead}>
            <span className={styles.label}>{labelOf(c.criterionId)}</span>
            <ResultValue result={c} />
          </div>
          {c.rationale && (
            <p className={styles.rationale} dir="auto">
              {c.rationale}
            </p>
          )}
          {c.evidence.length > 0 && (
            <div className={styles.evidence}>
              {c.evidence.map((e) => (
                <button
                  key={e.segmentId}
                  type="button"
                  className={styles.evidenceButton}
                  onClick={() =>
                    onEvidence(
                      e.startMs,
                      c.evidence.map((x) => x.segmentId),
                    )
                  }
                >
                  <Icon name="play" size={12} />
                  <span className="visually-hidden">{t('evaluations.evidenceAt')}</span>
                  <span className={styles.ts}>{formatDuration(e.startMs)}</span>
                  <span className={styles.quote} dir="auto">
                    {e.quote}
                  </span>
                </button>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ProhibitedHits({
  evaluation,
  onEvidence,
}: {
  evaluation: Evaluation;
  onEvidence: CriterionResultsProps['onEvidence'];
}) {
  const { t } = useI18n();
  return (
    <section className={styles.section} aria-label={t('evaluations.prohibited.title')}>
      <h3 className={styles.sectionTitle}>{t('evaluations.prohibited.title')}</h3>
      {evaluation.prohibitedHits.length === 0 ? (
        <p className={styles.rationale}>{t('evaluations.prohibited.none')}</p>
      ) : (
        <div className={styles.evidence}>
          {evaluation.prohibitedHits.map((h) => (
            <button
              key={`${h.expressionId}-${h.segmentId}`}
              type="button"
              className={styles.evidenceButton}
              onClick={() => onEvidence(h.startMs, [h.segmentId])}
            >
              <Icon name="flag" size={12} />
              <span className={styles.ts}>{formatDuration(h.startMs)}</span>
              <bdi>“{h.phrase}”</bdi>
            </button>
          ))}
        </div>
      )}
      <p className={styles.rationale}>{t('evaluations.prohibited.note')}</p>
    </section>
  );
}
