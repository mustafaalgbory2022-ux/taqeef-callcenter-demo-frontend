import { describe, expect, it } from 'vitest';
import type { TranscriptSegment } from '@/shared/types/domain';
import {
  findActiveSegment,
  findTranscriptMatches,
  locateEvidence,
  normalizeForSearch,
  normalizeWithMap,
  stepMatch,
} from './transcript';
import { validateUpload } from './upload';

const seg = (id: string, startMs: number, endMs: number, text = id): TranscriptSegment => ({
  id,
  startMs,
  endMs,
  speaker: 'agent',
  language: 'ar',
  text,
});

describe('findActiveSegment', () => {
  const segments = [seg('a', 0, 5000), seg('b', 6000, 9000)];
  it('finds the segment containing the time', () => {
    expect(findActiveSegment(segments, 2500)?.id).toBe('a');
    expect(findActiveSegment(segments, 6000)?.id).toBe('b');
  });
  it('returns null in gaps and after the end', () => {
    expect(findActiveSegment(segments, 5500)).toBeNull();
    expect(findActiveSegment(segments, 9500)).toBeNull();
  });
});

describe('validateUpload', () => {
  const audio = new File(['x'], 'call.wav', { type: 'audio/wav' });
  it('requires every field and the synthetic-data confirmation', () => {
    expect(
      validateUpload({ file: null, title: ' ', agentId: '', confirmSynthetic: false }),
    ).toEqual({
      file: 'calls.upload.errors.fileRequired',
      title: 'calls.upload.errors.titleRequired',
      agentId: 'calls.upload.errors.agentRequired',
      confirmSynthetic: 'calls.upload.errors.confirmRequired',
    });
  });
  it('rejects non-audio files', () => {
    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    expect(
      validateUpload({ file: pdf, title: 'A', agentId: 'a', confirmSynthetic: true }).file,
    ).toBe('calls.upload.errors.fileType');
  });
  it('accepts a valid synthetic upload', () => {
    expect(
      validateUpload({ file: audio, title: 'Test', agentId: 'a', confirmSynthetic: true }),
    ).toEqual({});
  });
});

describe('transcript search', () => {
  const segs = [
    seg('s1', 0, 5, 'هلا بيك، شلون أقدر أساعدك؟'),
    seg('s2', 6, 10, 'عندي سؤال عن الفاتورة'),
    seg('s3', 11, 15, 'Your invoice is ready'),
    seg('s4', 16, 20, 'الفاتوره وصلت'),
  ];

  it('ignores case, diacritics and alef/taa marbuta forms', () => {
    expect(normalizeForSearch('  أَقدرُ   ')).toBe('اقدر');
    expect(findTranscriptMatches(segs, 'الفاتورة')).toEqual(['s2', 's4']);
    expect(findTranscriptMatches(segs, 'اقدر')).toEqual(['s1']);
    expect(findTranscriptMatches(segs, 'INVOICE')).toEqual(['s3']);
  });

  it('needs at least two characters and returns nothing for no match', () => {
    expect(findTranscriptMatches(segs, 'ا')).toEqual([]);
    expect(findTranscriptMatches(segs, 'refund')).toEqual([]);
  });

  it('steps through matches with wrap-around', () => {
    expect(stepMatch(-1, 3, 1)).toBe(0);
    expect(stepMatch(-1, 3, -1)).toBe(2);
    expect(stepMatch(2, 3, 1)).toBe(0);
    expect(stepMatch(0, 3, -1)).toBe(2);
    expect(stepMatch(0, 0, 1)).toBe(-1);
  });
});

describe('evidence location', () => {
  const segs = [
    seg('s1', 0, 5000, 'هلا بيك، شلون أَقدر أساعدك؟'),
    seg('s2', 6000, 10000, 'Your  invoice is ready now'),
  ];
  const ref = (segmentId: string, quote: string, startMs = 0) => ({
    segmentId,
    startMs,
    endMs: null,
    quote,
  });

  it('maps normalized positions back to the original text', () => {
    const { norm, map } = normalizeWithMap('أَقدر  X');
    expect(norm).toBe('اقدر x');
    expect(map).toEqual([0, 2, 3, 4, 5, 7]);
  });

  it('highlights the exact quote inside the referenced line (Arabic and English)', () => {
    const ar = locateEvidence(segs, ref('s1', 'شلون اقدر', 1000));
    expect(ar).toMatchObject({ status: 'located', segmentId: 's1', startMs: 1000 });
    if (ar.status !== 'located' || !ar.range) throw new Error('expected range');
    expect(segs[0]?.text.slice(...ar.range)).toBe('شلون أَقدر');
    const en = locateEvidence(segs, ref('s2', 'INVOICE IS', 7000));
    if (en.status !== 'located' || !en.range) throw new Error('expected range');
    expect(segs[1]?.text.slice(...en.range)).toBe('invoice is');
  });

  it('locates the whole line when only the timestamp agrees', () => {
    expect(locateEvidence(segs, ref('s2', 'paraphrased summary', 8000))).toEqual({
      status: 'located',
      segmentId: 's2',
      startMs: 8000,
      range: null,
    });
    // Quote found but timestamp outside the line: play from the line start.
    expect(locateEvidence(segs, ref('s2', 'ready now', 60_000))).toMatchObject({ startMs: 6000 });
  });

  it('reports unavailable instead of guessing', () => {
    expect(locateEvidence(segs, ref('s9', 'invoice is ready'))).toEqual({
      status: 'unavailable',
      reason: 'segment_missing',
    });
    expect(locateEvidence(segs, ref('s1', 'invoice is ready', 8000))).toEqual({
      status: 'unavailable',
      reason: 'mismatch',
    });
  });
});
