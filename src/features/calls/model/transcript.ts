import type { TranscriptSegment } from '@/shared/types/domain';

/** The segment playing at `timeMs`, or the last one that started before it (gaps). */
export function findActiveSegment(
  segments: readonly TranscriptSegment[],
  timeMs: number,
): TranscriptSegment | null {
  let candidate: TranscriptSegment | null = null;
  for (const seg of segments) {
    if (seg.startMs > timeMs) break;
    candidate = seg;
  }
  return candidate && timeMs <= candidate.endMs ? candidate : null;
}

/** Harakat, superscript alef and tatweel are ignored when searching. */
const ARABIC_MARKS = /[\u064B-\u0652\u0670\u0640]/;
const FOLD: Readonly<Record<string, string>> = { إ: 'ا', أ: 'ا', آ: 'ا', ٱ: 'ا', ى: 'ي', ة: 'ه' };

/**
 * Normalized text plus, for every normalized character, the index of the original character
 * it came from — so a match found in normalized text can be highlighted in the original.
 */
export function normalizeWithMap(text: string): { norm: string; map: number[] } {
  let norm = '';
  const map: number[] = [];
  let pendingSpace = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] ?? '';
    if (ARABIC_MARKS.test(ch)) continue;
    if (/\s/.test(ch)) {
      if (norm.length > 0 && pendingSpace < 0) pendingSpace = i;
      continue;
    }
    if (pendingSpace >= 0) {
      norm += ' ';
      map.push(pendingSpace);
      pendingSpace = -1;
    }
    for (const out of (FOLD[ch] ?? ch).toLowerCase()) {
      norm += out;
      map.push(i);
    }
  }
  return { norm, map };
}

/**
 * Search key for transcript text: case-insensitive, ignores Arabic diacritics and tatweel,
 * unifies alef / alef maqsura / taa marbuta forms and collapses whitespace.
 */
export function normalizeForSearch(text: string): string {
  return normalizeWithMap(text.normalize('NFC')).norm;
}

/** Minimum query length before searching (avoids matching nearly every line). */
export const MIN_SEARCH_LENGTH = 2;

/** Ids of the segments whose text contains the query, in transcript order. */
export function findTranscriptMatches(
  segments: readonly TranscriptSegment[],
  query: string,
): string[] {
  const q = normalizeForSearch(query);
  if (q.length < MIN_SEARCH_LENGTH) return [];
  return segments.filter((s) => normalizeForSearch(s.text).includes(q)).map((s) => s.id);
}

/** Next match index when stepping forwards/backwards, wrapping around. */
export function stepMatch(current: number, total: number, delta: 1 | -1): number {
  if (total === 0) return -1;
  if (current < 0) return delta === 1 ? 0 : total - 1;
  return (current + delta + total) % total;
}

/** What an evaluation gives us to find its evidence (existing evaluation fields only). */
export interface EvidenceRef {
  segmentId: string;
  startMs: number;
  endMs: number | null;
  quote: string;
}

export type EvidenceLocation =
  | {
      status: 'located';
      segmentId: string;
      startMs: number;
      /** Character range of the quote inside the segment text; null = whole line. */
      range: readonly [number, number] | null;
    }
  | { status: 'unavailable'; reason: 'segment_missing' | 'mismatch' };

/** Evidence timestamps may differ slightly from segment bounds (rounding, alignment). */
export const EVIDENCE_TIME_TOLERANCE_MS = 1000;

/**
 * Find the transcript line an evidence item refers to — without guessing. The evidence's
 * segment id must exist, and either its quote must occur in that line's text (normalized as in
 * transcript search) or its timestamp must fall within the line. Otherwise it is unavailable.
 * Other lines are never searched for a similar quote.
 */
export function locateEvidence(
  segments: readonly TranscriptSegment[],
  evidence: EvidenceRef,
): EvidenceLocation {
  const seg = segments.find((s) => s.id === evidence.segmentId);
  if (!seg) return { status: 'unavailable', reason: 'segment_missing' };
  const quote = normalizeForSearch(evidence.quote);
  let range: readonly [number, number] | null = null;
  if (quote.length >= MIN_SEARCH_LENGTH) {
    const { norm, map } = normalizeWithMap(seg.text);
    const at = norm.indexOf(quote);
    if (at >= 0) {
      const first = map[at] ?? 0;
      const last = map[at + quote.length - 1] ?? first;
      range = [first, last + 1];
    }
  }
  const t = EVIDENCE_TIME_TOLERANCE_MS;
  const inTime = evidence.startMs >= seg.startMs - t && evidence.startMs <= seg.endMs + t;
  if (!range && !inTime) return { status: 'unavailable', reason: 'mismatch' };
  // Play from the evidence time when it lies within the line, otherwise from the line start.
  return {
    status: 'located',
    segmentId: seg.id,
    startMs: inTime ? evidence.startMs : seg.startMs,
    range,
  };
}
