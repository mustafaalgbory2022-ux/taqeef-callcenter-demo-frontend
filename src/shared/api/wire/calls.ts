import {
  CALL_STATUSES,
  type Call,
  type Transcript,
  type UploadAccepted,
} from '@/shared/types/domain';
import { arrayOf, bool, nullable, num, object, oneOf, str, type Decoded } from '../decode';
import { wireTimeToMs, utcTimestamp } from './common';
import { revisionId, segmentId } from './ids';

/**
 * Call summary. Status values are CONFIRMED (contract v0.2 item C). Other field names
 * (`title`, `channel_layout`) stay PROVISIONAL until response bodies are final (M4).
 * `audio_url` was removed: audio is always fetched from the call audio route.
 */
export const wireCall = object({
  id: str,
  title: str,
  agent_id: nullable(str),
  agent_display_name: nullable(str),
  language: oneOf(['ar', 'en', 'mixed']),
  duration_ms: nullable(num),
  recorded_at: utcTimestamp,
  status: oneOf(CALL_STATUSES),
  current_transcript_revision_id: nullable(revisionId),
  synthetic: bool,
  simulated: bool,
  source: oneOf(['fixture', 'upload']),
  channel_layout: oneOf(['dual', 'mixed']),
});

export function callFromWire(w: Decoded<typeof wireCall>): Call {
  return {
    id: w.id,
    title: w.title,
    agentId: w.agent_id,
    agentDisplayName: w.agent_display_name,
    language: w.language,
    durationMs: w.duration_ms === null ? null : wireTimeToMs(w.duration_ms),
    recordedAt: w.recorded_at,
    status: w.status,
    currentTranscriptRevisionId: w.current_transcript_revision_id,
    synthetic: w.synthetic,
    simulated: w.simulated,
    source: w.source,
    channelLayout: w.channel_layout,
  };
}

/** `202 {call_id, status: "uploaded", job_id}` (contract 5.3, CONFIRMED). */
export const wireUploadAccepted = object({
  call_id: str,
  status: oneOf(['uploaded']),
  job_id: str,
});

export function uploadAcceptedFromWire(w: Decoded<typeof wireUploadAccepted>): UploadAccepted {
  return { callId: w.call_id, jobId: w.job_id };
}

/**
 * One transcript revision. Revision identity and segment id format are CONFIRMED; the segment
 * field set (and the per-segment `speaker`, which will move to the run's role resolution) is
 * PROVISIONAL.
 */
export const wireTranscript = object({
  call_id: str,
  transcript_revision_id: revisionId,
  revision_no: num,
  segments: arrayOf(
    object({
      segment_id: segmentId,
      start_ms: num,
      end_ms: num,
      speaker: oneOf(['agent', 'customer', 'unknown']),
      language: oneOf(['ar', 'en']),
      text: str,
    }),
  ),
});

export function transcriptFromWire(w: Decoded<typeof wireTranscript>): Transcript {
  return {
    callId: w.call_id,
    revisionId: w.transcript_revision_id,
    revisionNo: w.revision_no,
    segments: w.segments.map((s) => ({
      id: s.segment_id,
      startMs: wireTimeToMs(s.start_ms),
      endMs: wireTimeToMs(s.end_ms),
      speaker: s.speaker,
      language: s.language,
      text: s.text,
    })),
  };
}
