import {
  CALL_STATUSES,
  JOB_STATES,
  REJECTION_REASONS,
  type Call,
  type Transcript,
  type UploadAccepted,
} from '@/shared/types/domain';
import {
  arrayOf,
  bool,
  DecodeError,
  nullable,
  num,
  object,
  oneOf,
  str,
  type Decoded,
  type Decoder,
} from '../decode';
import { wireTimeToMs, utcTimestamp } from './common';
import { opaqueId, revisionId, segmentId } from './ids';
import { isDisplayHundredths } from '@/shared/utils/score';

/** `channels`: 1 or 2 (contract v0.3 §5.3). */
const channelCount: Decoder<1 | 2> = (v, path = '') => {
  if (v !== 1 && v !== 2) throw new DecodeError(path, '1 or 2');
  return v;
};
const hundredths: Decoder<number> = (v, path = '') => {
  const n = num(v, path);
  if (!isDisplayHundredths(n)) throw new DecodeError(path, 'an integer 0–1000');
  return n;
};

/**
 * Call list item / detail (contract v0.3 §5.3; shape PROPOSED, enums CONFIRMED). Text fields
 * arrive masked (§2.2). Audio is always the call audio route; there is no `audio_url`.
 */
export const wireCall = object({
  call_id: opaqueId,
  display_name: str,
  agent_id: opaqueId,
  agent_display_name: str,
  uploaded_at: utcTimestamp,
  status: oneOf(CALL_STATUSES),
  rejection_reason: nullable(oneOf(REJECTION_REASONS)),
  hidden: bool,
  duration_ms: nullable(num),
  channels: nullable(channelCount),
  channel_map: nullable(oneOf(['left_agent', 'right_agent', 'none'])),
  current_transcript_revision_id: nullable(revisionId),
  latest_run: nullable(
    object({
      run_id: opaqueId,
      scorecard_version_id: opaqueId,
      scorecard_version_number: num,
      outcome: oneOf(['scored', 'insufficient_evidence', 'not_assessable']),
      display_hundredths: nullable(hundredths),
      below_threshold: nullable(bool),
      threshold_hundredths: hundredths,
      completed_at: utcTimestamp,
    }),
  ),
  latest_job: nullable(
    object({
      job_id: opaqueId,
      kind: oneOf(['probe', 'transcribe', 'evaluate']),
      state: oneOf(JOB_STATES),
      error_code: nullable(str),
      retry: oneOf(['yes', 'user_action', 'no', 'n/a']),
    }),
  ),
});

export function callFromWire(w: Decoded<typeof wireCall>): Call {
  // rejection_reason is non-null exactly when status = rejected (§5.1, CONFIRMED).
  if ((w.status === 'rejected') !== (w.rejection_reason !== null)) {
    throw new DecodeError('rejection_reason', 'a reason exactly when status is "rejected"');
  }
  const r = w.latest_run;
  if (r && (r.outcome === 'scored') !== (r.display_hundredths !== null)) {
    throw new DecodeError('latest_run.display_hundredths', 'a value exactly when scored');
  }
  if (r && (r.outcome === 'scored') !== (r.below_threshold !== null)) {
    throw new DecodeError('latest_run.below_threshold', 'a value exactly when scored');
  }
  return {
    id: w.call_id,
    title: w.display_name,
    agentId: w.agent_id,
    agentDisplayName: w.agent_display_name,
    uploadedAt: w.uploaded_at,
    status: w.status,
    rejectionReason: w.rejection_reason,
    hidden: w.hidden,
    durationMs: w.duration_ms === null ? null : wireTimeToMs(w.duration_ms),
    channels: w.channels,
    channelMap: w.channel_map,
    currentTranscriptRevisionId: w.current_transcript_revision_id,
    latestRun: r && {
      runId: r.run_id,
      scorecardVersionId: r.scorecard_version_id,
      scorecardVersionNumber: r.scorecard_version_number,
      outcome: r.outcome,
      displayHundredths: r.display_hundredths,
      belowThreshold: r.below_threshold,
      thresholdHundredths: r.threshold_hundredths,
      completedAt: r.completed_at,
    },
    latestJob: w.latest_job && {
      jobId: w.latest_job.job_id,
      kind: w.latest_job.kind,
      state: w.latest_job.state,
      errorCode: w.latest_job.error_code,
      retry: w.latest_job.retry,
    },
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
