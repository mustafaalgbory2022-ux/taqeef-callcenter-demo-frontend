import { useI18n } from '@/shared/i18n/I18nProvider';
import { Button } from '@/shared/ui/Button';
import { formatDuration } from '@/shared/utils/time';
import type { EvidenceLocation, EvidenceRef } from '../model/transcript';
import styles from './TranscriptView.module.css';

export interface EvidenceStatusProps {
  selection: { evidence: EvidenceRef; location: EvidenceLocation } | null;
  onPlay: (ms: number) => void;
  onShowLine: (segmentId: string) => void;
  onClear: () => void;
}

/**
 * Result of locating the selected evaluation evidence in the transcript. The region is always
 * mounted so screen readers announce each new result (role="status").
 */
export function EvidenceStatus({ selection, onPlay, onShowLine, onClear }: EvidenceStatusProps) {
  const { t } = useI18n();
  const location = selection?.location;
  return (
    <div className={styles.evidenceStatus} role="status" data-testid="evidence-status">
      {selection && location?.status === 'located' && (
        <div className={styles.evidenceBar}>
          <p className={styles.evidenceText}>
            {t('calls.evidence.located', { time: formatDuration(location.startMs) })}{' '}
            <q className={styles.evidenceQuote} dir="auto">
              {location.text}
            </q>
          </p>
          <div className={styles.evidenceActions}>
            <Button size="sm" icon="play" onClick={() => onPlay(location.startMs)}>
              {t('calls.evidence.play', { time: formatDuration(location.startMs) })}
            </Button>
            <Button size="sm" onClick={() => onShowLine(location.segmentId)}>
              {t('calls.evidence.showLine')}
            </Button>
            <Button size="sm" variant="ghost" onClick={onClear}>
              {t('calls.evidence.clear')}
            </Button>
          </div>
        </div>
      )}
      {selection && location?.status === 'unavailable' && (
        <div className={`${styles.evidenceBar} ${styles.evidenceUnavailable}`}>
          <p className={styles.evidenceText}>
            <strong>{t('calls.evidence.unavailable')}</strong>{' '}
            {t(`calls.evidence.reasons.${location.reason}`)}
          </p>
          <div className={styles.evidenceActions}>
            <Button size="sm" variant="ghost" onClick={onClear}>
              {t('calls.evidence.clear')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
