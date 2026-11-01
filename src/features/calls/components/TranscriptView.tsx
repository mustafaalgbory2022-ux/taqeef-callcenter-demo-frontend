import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { TranscriptSegment } from '@/shared/types/domain';
import { Checkbox } from '@/shared/ui/Field';
import { formatDuration } from '@/shared/utils/time';
import { findActiveSegment } from '../model/transcript';
import styles from './TranscriptView.module.css';

export interface TranscriptViewProps {
  segments: readonly TranscriptSegment[];
  currentMs: number;
  /** Segment ids to emphasise (e.g. evidence for a selected criterion). */
  highlightIds?: ReadonlySet<string> | undefined;
  onSeek: (ms: number) => void;
}

/** Timestamped transcript synced to playback. Each segment is a button that seeks. */
export function TranscriptView({ segments, currentMs, highlightIds, onSeek }: TranscriptViewProps) {
  const { t, fmt } = useI18n();
  const [follow, setFollow] = useState(true);
  const active = findActiveSegment(segments, currentMs);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!follow || !activeRef.current) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    activeRef.current.scrollIntoView?.({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [active?.id, follow]);

  return (
    <div>
      <div className={styles.toolbar}>
        <Checkbox checked={follow} onChange={setFollow}>
          {t('calls.transcript.follow')}
        </Checkbox>
      </div>
      <ol className={styles.list} aria-label={t('calls.transcript.title')}>
        {segments.map((seg) => {
          const isActive = seg.id === active?.id;
          const cls = [
            styles.segment,
            isActive ? styles.active : '',
            highlightIds?.has(seg.id) ? styles.highlight : '',
          ]
            .join(' ')
            .trim();
          return (
            <li key={seg.id}>
              <button
                ref={isActive ? activeRef : undefined}
                type="button"
                className={cls}
                aria-current={isActive ? 'true' : undefined}
                data-segment-id={seg.id}
                onClick={() => onSeek(seg.startMs)}
              >
                <span className={styles.time}>
                  <span className="visually-hidden">{t('calls.transcript.playFrom')} </span>
                  {formatDuration(seg.startMs)}
                </span>
                <span>
                  <span className={styles.speaker}>{t(`calls.transcript.${seg.speaker}`)}</span>
                  <span
                    className={styles.text}
                    lang={seg.language}
                    dir={seg.language === 'ar' ? 'rtl' : 'ltr'}
                  >
                    {seg.text}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <span className="visually-hidden">
        {t('calls.transcript.count', { n: fmt.integer(segments.length) })}
      </span>
    </div>
  );
}
