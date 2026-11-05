import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { TranscriptSegment } from '@/shared/types/domain';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Field';
import { formatDuration } from '@/shared/utils/time';
import {
  findActiveSegment,
  findTranscriptMatches,
  MIN_SEARCH_LENGTH,
  normalizeForSearch,
  stepMatch,
} from '../model/transcript';
import styles from './TranscriptView.module.css';

export interface TranscriptViewProps {
  segments: readonly TranscriptSegment[];
  currentMs: number;
  /** Segment ids to emphasise (e.g. evidence for a selected criterion). */
  highlightIds?: ReadonlySet<string> | undefined;
  /** The located evidence line (the whole segment is the evidence). */
  evidence?: { segmentId: string; key: number } | null;
  onSeek: (ms: number) => void;
}

/**
 * Timestamped transcript synced to playback. Each segment is a button that seeks.
 * Client-side search (no API) highlights matching lines and steps through them.
 */
export function TranscriptView({
  segments,
  currentMs,
  highlightIds,
  evidence,
  onSeek,
}: TranscriptViewProps) {
  const { t, fmt } = useI18n();
  const [follow, setFollow] = useState(true);
  const active = findActiveSegment(segments, currentMs);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLOListElement | null>(null);
  const searchId = useId();
  const [query, setQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(-1);
  const matches = useMemo(() => findTranscriptMatches(segments, query), [segments, query]);
  const matchSet = useMemo(() => new Set(matches), [matches]);
  const searching = normalizeForSearch(query).length >= MIN_SEARCH_LENGTH;
  const currentMatch = matchIndex >= 0 ? matches[matchIndex] : undefined;

  // Bring the located evidence line into view (also when re-selected), even if follow is off.
  const evidenceKey = evidence?.key;
  const evidenceId = evidence?.segmentId;
  useEffect(() => {
    if (!evidenceId) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-segment-id="${CSS.escape(evidenceId)}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [evidenceId, evidenceKey]);

  function goTo(delta: 1 | -1) {
    const next = stepMatch(matchIndex, matches.length, delta);
    setMatchIndex(next);
    const id = matches[next];
    if (!id) return;
    // Stop auto-scrolling so playback does not pull the view away from the match.
    setFollow(false);
    const el = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-segment-id="${CSS.escape(id)}"]`,
    );
    el?.scrollIntoView?.({ block: 'nearest' });
  }

  useEffect(() => {
    if (!follow || !activeRef.current) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    activeRef.current.scrollIntoView?.({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [active?.id, follow]);

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.search} role="search">
          <label htmlFor={searchId} className={styles.searchLabel}>
            {t('calls.transcript.search')}
          </label>
          <input
            id={searchId}
            type="search"
            dir="auto"
            className={styles.searchInput}
            value={query}
            aria-describedby={`${searchId}-status`}
            onChange={(e) => {
              setQuery(e.target.value);
              setMatchIndex(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                goTo(e.shiftKey ? -1 : 1);
              }
            }}
          />
          <Button size="sm" disabled={matches.length === 0} onClick={() => goTo(-1)}>
            {t('calls.transcript.previousMatch')}
          </Button>
          <Button size="sm" disabled={matches.length === 0} onClick={() => goTo(1)}>
            {t('calls.transcript.nextMatch')}
          </Button>
          <span
            id={`${searchId}-status`}
            className={styles.searchStatus}
            role="status"
            data-testid="transcript-search-status"
          >
            {searching &&
              (matches.length === 0
                ? t('calls.transcript.noMatches')
                : matchIndex >= 0
                  ? t('calls.transcript.matchPosition', {
                      n: fmt.integer(matchIndex + 1),
                      total: fmt.integer(matches.length),
                    })
                  : t('calls.transcript.matchCount', { n: fmt.integer(matches.length) }))}
          </span>
        </div>
        <Checkbox checked={follow} onChange={setFollow}>
          {t('calls.transcript.follow')}
        </Checkbox>
      </div>
      <ol ref={listRef} className={styles.list} aria-label={t('calls.transcript.title')}>
        {segments.map((seg) => {
          const isActive = seg.id === active?.id;
          const cls = [
            styles.segment,
            isActive ? styles.active : '',
            highlightIds?.has(seg.id) ? styles.highlight : '',
            matchSet.has(seg.id) ? styles.match : '',
            seg.id === currentMatch ? styles.currentMatch : '',
            seg.id === evidenceId ? styles.evidence : '',
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
                data-match={matchSet.has(seg.id) || undefined}
                data-evidence={seg.id === evidenceId || undefined}
                data-segment-id={seg.id}
                onClick={() => onSeek(seg.startMs)}
              >
                <span className={styles.time}>
                  <span className="visually-hidden">{t('calls.transcript.playFrom')} </span>
                  {formatDuration(seg.startMs)}
                </span>
                <span>
                  <span className={styles.speaker}>{t(`calls.transcript.${seg.speaker}`)}</span>
                  {seg.id === evidenceId && (
                    <span className="visually-hidden">{t('calls.evidence.lineLabel')} </span>
                  )}
                  {matchSet.has(seg.id) && (
                    <span className="visually-hidden">{t('calls.transcript.matchLabel')} </span>
                  )}
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
