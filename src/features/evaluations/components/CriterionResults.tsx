import { Fragment } from 'react';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Evaluation, ScorecardVersion } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Icon } from '@/shared/ui/Icon';
import { formatDuration } from '@/shared/utils/time';
import { ResultValue } from './ResultValue';
import styles from './Evaluation.module.css';

/** One evidence reference: a segment of the run's own transcript revision. */
export interface EvidenceSelection {
  segmentId: string;
  transcriptRevisionId: string;
}

/** Time and text of a referenced segment, taken from the transcript revision. */
export interface ResolvedSegment {
  startMs: number;
  text: string;
}

export interface CriterionResultsProps {
  evaluation: Evaluation;
  version: ScorecardVersion | undefined;
  /** Look up a reference in the loaded transcript; null when it cannot be resolved. */
  resolveEvidence: (evidence: EvidenceSelection) => ResolvedSegment | null;
  /** `group` = all segment ids cited for the same criterion (shown as related lines). */
  onEvidence: (evidence: EvidenceSelection, group: readonly string[]) => void;
}

/** Criterion-level results with rationale and evidence that seeks the recording. */
export function CriterionResults({
  evaluation,
  version,
  resolveEvidence,
  onEvidence,
}: CriterionResultsProps) {
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
          {c.rationale ? (
            <div className={styles.aiExplanation}>
              <span className={styles.aiLabel}>
                <Icon name="info" size={12} />
                {t('evaluations.aiLabel')}
              </span>
              {/* AI output is rendered as plain text only, never as HTML. */}
              <p className={styles.rationale} dir="auto">
                {c.rationale}
              </p>
              {c.explanationTruncated && (
                <span className={styles.reason} data-testid="explanation-truncated">
                  {t('evaluations.explanationTruncated')}
                </span>
              )}
            </div>
          ) : (
            c.result === 'not_assessable' && (
              <p className={styles.rationale}>{t('evaluations.reasonMissing')}</p>
            )
          )}
          {c.evidence.length > 0 && (
            <div className={styles.evidence}>
              {c.evidence.map((e) => {
                // The reference is the served pair {revision, segment} (contract v0.3 §7.5).
                const ref = {
                  segmentId: e.segmentId,
                  transcriptRevisionId: e.transcriptRevisionId,
                };
                const located = resolveEvidence(ref) !== null;
                return (
                  <Fragment key={e.segmentId}>
                    <button
                      type="button"
                      className={styles.evidenceButton}
                      data-evidence-segment={e.segmentId}
                      onClick={() =>
                        onEvidence(
                          ref,
                          c.evidence.map((x) => x.segmentId),
                        )
                      }
                    >
                      <Icon name="play" size={12} />
                      <span className="visually-hidden">{t('evaluations.evidenceAt')}</span>
                      <span className={styles.ts}>{formatDuration(e.startMs)}</span>
                      {/* The server's masked excerpt, shown exactly as served. */}
                      <span className={styles.quote} dir="auto" data-testid="evidence-excerpt">
                        {e.excerpt}
                      </span>
                    </button>
                    {e.excerptTruncated && (
                      <span className={styles.reason} data-testid="excerpt-truncated">
                        {t('evaluations.excerptTruncated')}
                      </span>
                    )}
                    {!e.counted && (
                      <span className={styles.reason} data-testid="evidence-not-counted">
                        {t('evaluations.evidenceNotCounted')}
                      </span>
                    )}
                    {!located && (
                      <span className={styles.reason}>
                        {t('evaluations.evidenceUnresolved', { id: e.segmentId })}
                      </span>
                    )}
                  </Fragment>
                );
              })}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ProhibitedHits({
  evaluation,
  resolveEvidence,
  onEvidence,
}: {
  evaluation: Evaluation;
  resolveEvidence: CriterionResultsProps['resolveEvidence'];
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
          {evaluation.prohibitedHits.map((h) => {
            const ref = {
              segmentId: h.segmentId,
              transcriptRevisionId: evaluation.transcriptRevisionId,
            };
            const seg = resolveEvidence(ref);
            return (
              <span key={`${h.expressionId}-${h.segmentId}`} className={styles.hit}>
                <button
                  type="button"
                  className={styles.evidenceButton}
                  onClick={() => onEvidence(ref, [h.segmentId])}
                >
                  <Icon name="flag" size={12} />
                  {seg && <span className={styles.ts}>{formatDuration(seg.startMs)}</span>}
                  <bdi>“{h.phrase}”</bdi>
                </button>
                <Badge>{t(`evaluations.speaker.${h.speaker}`)}</Badge>
                {h.disposition === 'penalty_applied' ? (
                  <Badge tone="danger" icon="minus">
                    {t(
                      h.penaltyPoints === 1
                        ? 'evaluations.prohibited.penaltyAppliedOne'
                        : 'evaluations.prohibited.penaltyApplied',
                      { n: fmt.integer(h.penaltyPoints) },
                    )}
                  </Badge>
                ) : (
                  <Badge tone="warning" icon="flag">
                    {t('evaluations.prohibited.flagged')}
                  </Badge>
                )}
              </span>
            );
          })}
        </div>
      )}
      <p className={styles.rationale}>{t('evaluations.prohibited.note')}</p>
    </section>
  );
}
