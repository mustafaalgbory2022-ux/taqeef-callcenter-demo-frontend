import type { Transcript, TranscriptSegment } from '@/shared/types/domain';

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

/**
 * An evidence reference: a segment of a specific transcript revision (demo API contract 2.3).
 * It carries no time or text of its own.
 */
export interface EvidenceRef {
  segmentId: string;
  transcriptRevisionId: string;
}

export type EvidenceLocation =
  | {
      status: 'located';
      segmentId: string;
      startMs: number;
      endMs: number;
      /** The segment text from the transcript revision (never model output). */
      text: string;
    }
  | { status: 'unavailable'; reason: 'segment_missing' | 'revision_mismatch' };

/**
 * Resolve an evidence reference against a loaded transcript revision — without guessing.
 * The revision must be the one the run evaluated (a bare segment id is never resolved
 * against another revision) and the segment must exist in it. Time and text always come from
 * that segment.
 */
export function locateEvidence(
  transcript: Pick<Transcript, 'revisionId' | 'segments'>,
  evidence: EvidenceRef,
): EvidenceLocation {
  if (transcript.revisionId !== evidence.transcriptRevisionId)
    return { status: 'unavailable', reason: 'revision_mismatch' };
  const seg = transcript.segments.find((s) => s.id === evidence.segmentId);
  if (!seg) return { status: 'unavailable', reason: 'segment_missing' };
  return {
    status: 'located',
    segmentId: seg.id,
    startMs: seg.startMs,
    endMs: seg.endMs,
    text: seg.text,
  };
}
