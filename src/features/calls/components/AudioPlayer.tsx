import { useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { Notice } from '@/shared/ui/Notice';
import { formatDuration } from '@/shared/utils/time';
import type { AudioPlayerState } from '../hooks/useAudioPlayer';
import { PLAYER_SHORTCUTS, playerShortcut } from '../model/shortcuts';
import styles from './AudioPlayer.module.css';

const RATES = [0.75, 1, 1.25, 1.5, 2];
const SKIP_MS = 5000;

/**
 * Accessible custom controls over a native <audio>. The timeline is kept left-to-right
 * in both languages (media convention); the seek slider supports arrow keys natively.
 */
export function AudioPlayer({
  src,
  player,
  simulated,
}: {
  src: string | null;
  player: AudioPlayerState;
  simulated: boolean;
}) {
  const { t } = useI18n();
  const playRef = useRef<HTMLDivElement>(null);
  const helpId = useId();
  const [announcement, setAnnouncement] = useState('');
  // The listener reads the latest state without re-binding on every time update.
  const latest = useRef(player);
  useEffect(() => {
    latest.current = player;
  });

  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      const action = playerShortcut(e);
      if (!action) return;
      e.preventDefault();
      const p = latest.current;
      if (action === 'focus') {
        playRef.current?.querySelector<HTMLButtonElement>('[data-player-play]')?.focus();
        return;
      }
      if (action === 'toggle') {
        p.toggle();
        setAnnouncement(
          t(p.playing ? 'calls.player.announcePaused' : 'calls.player.announcePlaying', {
            time: formatDuration(p.currentMs),
          }),
        );
        return;
      }
      const target = Math.min(
        p.durationMs,
        Math.max(0, p.currentMs + (action === 'back' ? -SKIP_MS : SKIP_MS)),
      );
      p.skip(action === 'back' ? -SKIP_MS : SKIP_MS);
      setAnnouncement(t('calls.player.announcePosition', { time: formatDuration(target) }));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [src, t]);

  if (!src)
    return (
      <Notice tone="info" title={t('calls.player.unavailable')}>
        {t('calls.player.unavailableBody')}
      </Notice>
    );
  const { audioRef, playing, currentMs, durationMs, rate, error, toggle, seek, skip, setRate } =
    player;

  return (
    <div className={styles.player} ref={playRef}>
      <audio ref={audioRef} src={src} preload="metadata" />
      {error && <Notice tone="danger" title={t('calls.player.error')} />}
      <div className={styles.controls}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => skip(-SKIP_MS)}
          aria-keyshortcuts={PLAYER_SHORTCUTS.back.key}
        >
          <Icon name="back5" />
          <span className="visually-hidden">{t('calls.player.back')}</span>
        </Button>
        <Button
          variant="primary"
          className={styles.play}
          onClick={toggle}
          aria-pressed={playing}
          aria-keyshortcuts={PLAYER_SHORTCUTS.toggle.key}
          aria-describedby={helpId}
          data-player-play=""
        >
          <Icon name={playing ? 'pause' : 'play'} size={18} />
          <span className="visually-hidden">
            {t(playing ? 'calls.player.pause' : 'calls.player.play')}
          </span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => skip(SKIP_MS)}
          aria-keyshortcuts={PLAYER_SHORTCUTS.forward.key}
        >
          <Icon name="fwd5" />
          <span className="visually-hidden">{t('calls.player.forward')}</span>
        </Button>
        <label className={styles.rate}>
          {t('calls.player.speed')}
          <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
            {RATES.map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.timeline}>
        <span className={styles.time}>{formatDuration(currentMs)}</span>
        <input
          className={styles.range}
          type="range"
          min={0}
          max={Math.max(1, Math.round(durationMs))}
          step={1000}
          value={Math.round(currentMs)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label={t('calls.player.seek')}
          aria-valuetext={`${formatDuration(currentMs)} / ${formatDuration(durationMs)}`}
        />
        <span className={styles.time}>{formatDuration(durationMs)}</span>
      </div>
      <details className={styles.shortcuts}>
        <summary>{t('calls.player.shortcuts.title')}</summary>
        <dl id={helpId} className={styles.shortcutList} data-testid="player-shortcuts">
          {(['toggle', 'back', 'forward', 'focus'] as const).map((a) => (
            <div key={a} className={styles.shortcutRow}>
              <dt>
                <kbd dir="ltr">{PLAYER_SHORTCUTS[a].key}</kbd>
              </dt>
              <dd>{t(`calls.player.shortcuts.${a}`)}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.note}>{t('calls.player.shortcuts.note')}</p>
      </details>
      <span className="visually-hidden" role="status" data-testid="player-announcement">
        {announcement}
      </span>
      {simulated && <p className={styles.note}>{t('calls.player.syntheticAudio')}</p>}
    </div>
  );
}
