import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Evaluation, ScorecardVersion } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Icon } from '@/shared/ui/Icon';
import { formatDuration } from '@/shared/utils/time';
import { ResultValue } from './ResultValue';
import styles from './Evaluation.module.css';

/** The existing evaluation fields identifying one evidence item (no new data). */
export interface EvidenceSelection {
  segmentId: string;
  startMs: number;
  /** Prohibited-expression hits have no end time. */
  endMs: number | null;
  quote: string;
}

export interface CriterionResultsProps {
  evaluation: Evaluation;
  version: ScorecardVersion | undefined;
  /** `group` = all segment ids cited for the same criterion (shown as related lines). */
  onEvidence: (evidence: EvidenceSelection, group: readonly string[]) => void;
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
                      {
                        segmentId: e.segmentId,
                        startMs: e.startMs,
                        endMs: e.endMs,
                        quote: e.quote,
                      },
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
  const { t, fmt } = useI18n();
  return (
    <section className={styles.section} aria-label={t('evaluations.prohibited.title')}>
      <h3 className={styles.sectionTitle}>{t('evaluations.prohibited.title')}</h3>
      {evaluation.prohibitedHits.length === 0 ? (
        <p className={styles.rationale}>{t('evaluations.prohibited.none')}</p>
      ) : (
        <div className={styles.evidence}>
          {evaluation.prohibitedHits.map((h) => (
            <span key={`${h.expressionId}-${h.segmentId}`} className={styles.hit}>
              <button
                type="button"
                className={styles.evidenceButton}
                onClick={() =>
                  onEvidence(
                    { segmentId: h.segmentId, startMs: h.startMs, endMs: null, quote: h.quote },
                    [h.segmentId],
                  )
                }
              >
                <Icon name="flag" size={12} />
                <span className={styles.ts}>{formatDuration(h.startMs)}</span>
                <bdi>“{h.phrase}”</bdi>
              </button>
              <Badge>{t(`evaluations.speaker.${h.speaker}`)}</Badge>
              {h.disposition === 'penalty_applied' ? (
                <Badge tone="danger" icon="minus">
                  {t('evaluations.prohibited.penaltyApplied', { n: fmt.integer(h.penaltyPoints) })}
                </Badge>
              ) : (
                <Badge tone="warning" icon="flag">
                  {t('evaluations.prohibited.flagged')}
                </Badge>
              )}
            </span>
          ))}
        </div>
      )}
      <p className={styles.rationale}>{t('evaluations.prohibited.note')}</p>
    </section>
  );
}
