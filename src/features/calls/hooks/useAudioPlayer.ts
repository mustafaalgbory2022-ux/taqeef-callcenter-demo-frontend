import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export interface AudioPlayerState {
  audioRef: RefObject<HTMLAudioElement | null>;
  playing: boolean;
  currentMs: number;
  durationMs: number;
  rate: number;
  error: boolean;
  toggle: () => void;
  seek: (ms: number, play?: boolean) => void;
  skip: (deltaMs: number) => void;
  setRate: (rate: number) => void;
}

/** Behaviour of the call audio player, separate from its presentation. */
export function useAudioPlayer(
  src: string | null,
  fallbackDurationMs: number | null,
): AudioPlayerState {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(fallbackDurationMs ?? 0);
  const [rate, setRateState] = useState(1);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentMs(audio.currentTime * 1000);
    const onMeta = () => Number.isFinite(audio.duration) && setDurationMs(audio.duration * 1000);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => setError(true);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onPause);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onPause);
      audio.removeEventListener('error', onError);
    };
  }, [src]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, []);

  const seek = useCallback((ms: number, play = false) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, ms / 1000);
    setCurrentMs(Math.max(0, ms));
    if (play) void audio.play().catch(() => setPlaying(false));
  }, []);

  const skip = useCallback(
    (deltaMs: number) => seek(Math.min(durationMs, Math.max(0, currentMs + deltaMs))),
    [seek, currentMs, durationMs],
  );

  const setRate = useCallback((value: number) => {
    if (audioRef.current) audioRef.current.playbackRate = value;
    setRateState(value);
  }, []);

  return { audioRef, playing, currentMs, durationMs, rate, error, toggle, seek, skip, setRate };
}
