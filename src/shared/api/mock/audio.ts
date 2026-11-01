import type { WireSegment } from './types';

const SAMPLE_RATE = 8000;
const cache = new Map<string, string>();

/**
 * Generate SYNTHETIC "speech-like" audio (tones shaped like syllables) aligned with the
 * transcript, so playback and transcript sync can be demonstrated without any recording.
 */
export function synthesizeCallAudio(
  callId: string,
  durationMs: number,
  segments: readonly WireSegment[],
): string | null {
  if (typeof URL.createObjectURL !== 'function') return null;
  const cached = cache.get(callId);
  if (cached) return cached;

  const total = Math.ceil((durationMs / 1000) * SAMPLE_RATE);
  const samples = new Int16Array(total);
  for (const seg of segments) {
    const start = Math.floor((seg.start_ms / 1000) * SAMPLE_RATE);
    const end = Math.min(total, Math.floor((seg.end_ms / 1000) * SAMPLE_RATE));
    const f0 = seg.speaker === 'agent' ? 150 : 215;
    for (let i = start; i < end; i++) {
      const t = (i - start) / SAMPLE_RATE;
      const syllable = Math.max(0, Math.sin(Math.PI * 4.2 * t)) ** 1.5;
      const pitch = f0 * (1 + 0.06 * Math.sin(2 * Math.PI * 0.7 * t));
      const phase = 2 * Math.PI * pitch * t;
      const voice = Math.sin(phase) + 0.45 * Math.sin(2 * phase) + 0.2 * Math.sin(3 * phase);
      const fade = Math.min(1, (i - start) / 400, (end - i) / 400);
      samples[i] = Math.round(voice * syllable * fade * 6000);
    }
  }
  const url = URL.createObjectURL(encodeWav(samples));
  cache.set(callId, url);
  return url;
}

function encodeWav(samples: Int16Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  new Int16Array(buffer, 44).set(samples);
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Uploaded files are kept as in-memory object URLs only (never persisted). */
export function registerUploadedAudio(callId: string, file: File): string | null {
  if (typeof URL.createObjectURL !== 'function') return null;
  const url = URL.createObjectURL(file);
  cache.set(callId, url);
  return url;
}

export function cachedAudioUrl(callId: string): string | null {
  return cache.get(callId) ?? null;
}
