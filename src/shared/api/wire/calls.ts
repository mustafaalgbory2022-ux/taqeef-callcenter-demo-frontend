import type { Call, CallReview, Transcript } from '@/shared/types/domain';
import { arrayOf, bool, nullable, num, object, oneOf, str, type Decoded } from '../decode';
import { wireTimeToMs } from './common';

export const CALL_REASONS = [
  'billing',
  'technical',
  'plan_change',
  'new_service',
  'cancellation',
  'general_inquiry',
  'other',
] as const;

export const wireCall = object({
  id: str,
  title: str,
  agent_id: nullable(str),
  queue_id: nullable(str),
  language: oneOf(['ar', 'en', 'mixed']),
  duration_ms: nullable(num),
  recorded_at: str,
  status: oneOf(['uploaded', 'transcribing', 'scoring', 'scored', 'failed']),
  audio_url: nullable(str),
  synthetic: bool,
  simulated: bool,
  source: oneOf(['fixture', 'upload', 'pbx']),
  channel_layout: oneOf(['dual', 'mixed']),
  caller_masked: nullable(str),
  classification: nullable(
    object({
      reason: oneOf(CALL_REASONS),
      complaint: bool,
      service_request: bool,
      confidence: num,
    }),
  ),
  review: object({
    status: oneOf(['unreviewed', 'reviewed', 'needs_follow_up']),
    note: str,
    reviewed_by: nullable(str),
    reviewed_at: nullable(str),
  }),
});

export const wireCallPage = object({
  items: arrayOf(wireCall),
  total: num,
  page: num,
  page_size: num,
});

export function callFromWire(w: Decoded<typeof wireCall>): Call {
  return {
    id: w.id,
    title: w.title,
    agentId: w.agent_id,
    queueId: w.queue_id,
    language: w.language,
    durationMs: w.duration_ms === null ? null : wireTimeToMs(w.duration_ms),
    recordedAt: w.recorded_at,
    status: w.status,
    audioUrl: w.audio_url,
    synthetic: w.synthetic,
    simulated: w.simulated,
    source: w.source,
    channelLayout: w.channel_layout,
    callerMasked: w.caller_masked,
    classification: w.classification && {
      reason: w.classification.reason,
      complaint: w.classification.complaint,
      serviceRequest: w.classification.service_request,
      confidence: w.classification.confidence,
    },
    review: {
      status: w.review.status,
      note: w.review.note,
      reviewedBy: w.review.reviewed_by,
      reviewedAt: w.review.reviewed_at,
    },
  };
}

export const wireTranscript = object({
  call_id: str,
  segments: arrayOf(
    object({
      id: str,
      start_ms: num,
      end_ms: num,
      speaker: oneOf(['agent', 'customer', 'unresolved']),
      language: oneOf(['ar', 'en']),
      text: str,
    }),
  ),
});

export function transcriptFromWire(w: Decoded<typeof wireTranscript>): Transcript {
  return {
    callId: w.call_id,
    segments: w.segments.map((s) => ({
      id: s.id,
      startMs: wireTimeToMs(s.start_ms),
      endMs: wireTimeToMs(s.end_ms),
      speaker: s.speaker,
      language: s.language,
      text: s.text,
    })),
  };
}

export function reviewToWire(review: Pick<CallReview, 'status' | 'note'>): Record<string, unknown> {
  return { status: review.status, note: review.note.trim() };
}
