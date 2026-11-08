import { describe, expect, it } from 'vitest';
import { CALL_STATUSES, type TranscriptSegment } from '@/shared/types/domain';
import { isEvaluatedStatus, isProcessingStatus, pipelineIndex, statusGroup } from './status';
import {
  findActiveSegment,
  findTranscriptMatches,
  locateEvidence,
  revisionToShow,
  normalizeForSearch,
  normalizeWithMap,
  stepMatch,
} from './transcript';
import { validateUpload } from './upload';

const seg = (id: string, startMs: number, endMs: number, text = id): TranscriptSegment => ({
  id,
  startMs,
  endMs,
  channel: 'L',
  speakerLabel: 'CH-L',
  language: 'ar',
  text,
  asrConfidencePermille: 900,
  lowConfidence: false,
  flags: [],
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
  it('requires the file, the agent and the synthetic-data confirmation; the name is optional', () => {
    expect(
      validateUpload({
        file: null,
        title: ' ',
        agentId: '',
        channelMap: '',
        confirmSynthetic: false,
      }),
    ).toEqual({
      file: 'calls.upload.errors.fileRequired',
      agentId: 'calls.upload.errors.agentRequired',
      confirmSynthetic: 'calls.upload.errors.confirmRequired',
    });
  });
  it('accepts WAV only (contract 5.3)', () => {
    const base = { title: 'A', agentId: 'a', channelMap: '' as const, confirmSynthetic: true };
    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    const mp3 = new File(['x'], 'a.mp3', { type: 'audio/mpeg' });
    expect(validateUpload({ ...base, file: pdf }).file).toBe('calls.upload.errors.fileType');
    expect(validateUpload({ ...base, file: mp3 }).file).toBe('calls.upload.errors.fileType');
    const long = { ...base, title: 'x'.repeat(201), file: new File(['x'], 'a.wav') };
    expect(validateUpload(long).title).toBe('calls.upload.errors.titleTooLong');
  });
  it('accepts a valid synthetic upload', () => {
    expect(
      validateUpload({
        file: audio,
        title: 'Test',
        agentId: 'a',
        channelMap: '',
        confirmSynthetic: true,
      }),
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
  const REV = '0193a000-0000-7000-8000-000000000001';
  const OTHER = '0193a000-0000-7000-8000-000000000002';
  const transcript = {
    revisionId: REV,
    segments: [
      seg('seg-0001', 0, 5000, 'هلا بيك، شلون أَقدر أساعدك؟'),
      seg('seg-0002', 6000, 10000, 'Your  invoice is ready now'),
    ],
  };

  it('maps normalized positions back to the original text', () => {
    const { norm, map } = normalizeWithMap('أَقدر  X');
    expect(norm).toBe('اقدر x');
    expect(map).toEqual([0, 2, 3, 4, 5, 7]);
  });

  it('takes time and text from the referenced segment of the same revision', () => {
    expect(
      locateEvidence(transcript, { segmentId: 'seg-0002', transcriptRevisionId: REV }),
    ).toEqual({
      status: 'located',
      segmentId: 'seg-0002',
      startMs: 6000,
      endMs: 10000,
      text: 'Your  invoice is ready now',
    });
  });

  it('never resolves a segment id against another revision', () => {
    expect(
      locateEvidence(transcript, { segmentId: 'seg-0002', transcriptRevisionId: OTHER }),
    ).toEqual({ status: 'unavailable', reason: 'revision_mismatch' });
  });

  it('reports a missing segment instead of guessing', () => {
    expect(
      locateEvidence(transcript, { segmentId: 'seg-0009', transcriptRevisionId: REV }),
    ).toEqual({ status: 'unavailable', reason: 'segment_missing' });
  });
});

describe('call status model (contract v0.2 item C)', () => {
  it('groups the twelve statuses into processing, evaluated and failed', () => {
    expect(CALL_STATUSES.filter(isProcessingStatus)).toEqual([
      'uploaded',
      'probing',
      'ready',
      'transcribing',
      'transcribed',
      'evaluating',
    ]);
    expect(CALL_STATUSES.filter(isEvaluatedStatus)).toEqual([
      'scored',
      'insufficient_evidence',
      'not_assessable',
    ]);
    expect(CALL_STATUSES.filter((s) => statusGroup(s) === 'failed')).toEqual([
      'rejected',
      'transcription_failed',
      'evaluation_failed',
    ]);
  });
  it('orders pipeline steps and treats evaluated as complete', () => {
    expect(pipelineIndex('uploaded')).toBe(0);
    expect(pipelineIndex('evaluating')).toBe(5);
    expect(pipelineIndex('not_assessable')).toBe(6);
    expect(pipelineIndex('evaluation_failed')).toBe(-1);
  });
});

describe('revisionToShow (contract v0.2 item 7)', () => {
  const call = { currentTranscriptRevisionId: 'rev-new' };
  it("uses the run's revision, not the call's latest", () => {
    expect(revisionToShow(call, { transcriptRevisionId: 'rev-old' })).toEqual({
      revisionId: 'rev-old',
      isLatest: false,
    });
    expect(revisionToShow(call, { transcriptRevisionId: 'rev-new' })).toEqual({
      revisionId: 'rev-new',
      isLatest: true,
    });
  });
  it('falls back to the current revision when there is no run', () => {
    expect(revisionToShow(call, undefined)).toEqual({ revisionId: 'rev-new', isLatest: true });
  });
});
