import { describe, expect, it } from 'vitest';
import type { TranscriptSegment } from '@/shared/types/domain';
import { findActiveSegment } from './transcript';
import { validateUpload } from './upload';

const seg = (id: string, startMs: number, endMs: number): TranscriptSegment => ({
  id,
  startMs,
  endMs,
  speaker: 'agent',
  language: 'ar',
  text: id,
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
