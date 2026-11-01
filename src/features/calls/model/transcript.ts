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
