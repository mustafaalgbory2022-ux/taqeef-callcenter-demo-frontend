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
const ARABIC_MARKS = /[ً-ْٰـ]/g;

/**
 * Search key for transcript text: case-insensitive, ignores Arabic diacritics and tatweel,
 * unifies alef / alef maqsura / taa marbuta forms and collapses whitespace.
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFC')
    .replace(ARABIC_MARKS, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
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
