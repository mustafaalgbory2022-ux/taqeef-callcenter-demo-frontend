import type {
  AiConfigDraft,
  AiConfigVersion,
  AiJob,
  AiJobQueue,
  AiModel,
  AiStatus,
} from '@/shared/types/domain';
import {
  arrayOf,
  bool,
  nullable,
  num,
  numInRange,
  object,
  oneOf,
  str,
  type Decoded,
} from '../decode';

/* PROVISIONAL wire shapes for the AI administration endpoints (see docs/api-adapter.md). */

export const wireAiModel = object({
  id: str,
  kind: oneOf(['transcription', 'evaluation']),
  name: str,
  version: str,
  size_gb: num,
  min_vram_gb: num,
  languages: arrayOf(str),
  status: oneOf(['available', 'not_installed', 'incompatible']),
  synthetic: bool,
});

export function aiModelFromWire(w: Decoded<typeof wireAiModel>): AiModel {
  return {
    id: w.id,
    kind: w.kind,
    name: w.name,
    version: w.version,
    sizeGb: w.size_gb,
    minVramGb: w.min_vram_gb,
    languages: w.languages,
    status: w.status,
    synthetic: w.synthetic,
  };
}

const wireLimits = object({
  max_concurrent_jobs: num,
  max_audio_minutes: num,
  max_queue_length: num,
  retry_limit: num,
  job_timeout_minutes: num,
});

const draftShape = {
  transcription_model_id: str,
  evaluation_model_id: str,
  language: oneOf(['ar-IQ', 'ar', 'auto']),
  diarization: oneOf(['channel', 'model', 'off']),
  apply_dictionary: bool,
  temperature: numInRange(0, 1),
  min_classification_confidence: numInRange(0, 1),
  low_confidence_action: oneOf(['flag_for_review', 'exclude_from_reports']),
  require_evidence_quotes: bool,
  scorecard_binding: oneOf(['latest', 'pinned']),
  pinned_scorecard_version: nullable(num),
  limits: wireLimits,
  prompts: object({ evaluation: str, classification: str, summary: str }),
  change_note: str,
};

export const wireAiConfig = object({
  ...draftShape,
  version: num,
  created_at: str,
  created_by: str,
  simulated: bool,
});

export function aiConfigFromWire(w: Decoded<typeof wireAiConfig>): AiConfigVersion {
  return {
    version: w.version,
    createdAt: w.created_at,
    createdBy: w.created_by,
    simulated: w.simulated,
    transcriptionModelId: w.transcription_model_id,
    evaluationModelId: w.evaluation_model_id,
    language: w.language,
    diarization: w.diarization,
    applyDictionary: w.apply_dictionary,
    temperature: w.temperature,
    minClassificationConfidence: w.min_classification_confidence,
    lowConfidenceAction: w.low_confidence_action,
    requireEvidenceQuotes: w.require_evidence_quotes,
    scorecardBinding: w.scorecard_binding,
    pinnedScorecardVersion: w.pinned_scorecard_version,
    limits: {
      maxConcurrentJobs: w.limits.max_concurrent_jobs,
      maxAudioMinutes: w.limits.max_audio_minutes,
      maxQueueLength: w.limits.max_queue_length,
      retryLimit: w.limits.retry_limit,
      jobTimeoutMinutes: w.limits.job_timeout_minutes,
    },
    prompts: w.prompts,
    changeNote: w.change_note,
  };
}

export function aiDraftToWire(d: AiConfigDraft): Record<string, unknown> {
  return {
    transcription_model_id: d.transcriptionModelId,
    evaluation_model_id: d.evaluationModelId,
    language: d.language,
    diarization: d.diarization,
    apply_dictionary: d.applyDictionary,
    temperature: d.temperature,
    min_classification_confidence: d.minClassificationConfidence,
    low_confidence_action: d.lowConfidenceAction,
    require_evidence_quotes: d.requireEvidenceQuotes,
    scorecard_binding: d.scorecardBinding,
    pinned_scorecard_version: d.scorecardBinding === 'pinned' ? d.pinnedScorecardVersion : null,
    limits: {
      max_concurrent_jobs: d.limits.maxConcurrentJobs,
      max_audio_minutes: d.limits.maxAudioMinutes,
      max_queue_length: d.limits.maxQueueLength,
      retry_limit: d.limits.retryLimit,
      job_timeout_minutes: d.limits.jobTimeoutMinutes,
    },
    prompts: { ...d.prompts },
    change_note: d.changeNote.trim(),
  };
}

export const wireAiStatus = object({
  generated_at: str,
  simulated: bool,
  config_version: num,
  services: arrayOf(
    object({
      kind: oneOf(['transcription', 'evaluation']),
      state: oneOf(['ready', 'loading', 'degraded', 'offline']),
      model_id: str,
      message: str,
    }),
  ),
});

export function aiStatusFromWire(w: Decoded<typeof wireAiStatus>): AiStatus {
  return {
    generatedAt: w.generated_at,
    simulated: w.simulated,
    configVersion: w.config_version,
    services: w.services.map((s) => ({
      kind: s.kind,
      state: s.state,
      modelId: s.model_id,
      message: s.message,
    })),
  };
}

export const wireAiJob = object({
  id: str,
  call_id: str,
  stage: oneOf(['transcription', 'evaluation', 'classification']),
  state: oneOf(['queued', 'running', 'completed', 'failed', 'cancelled']),
  attempts: num,
  created_at: str,
  updated_at: str,
  error: nullable(str),
});

export const wireAiJobQueue = object({ paused: bool, simulated: bool, jobs: arrayOf(wireAiJob) });

export function aiJobFromWire(w: Decoded<typeof wireAiJob>): AiJob {
  return {
    id: w.id,
    callId: w.call_id,
    stage: w.stage,
    state: w.state,
    attempts: w.attempts,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
    error: w.error,
  };
}

export function aiJobQueueFromWire(w: Decoded<typeof wireAiJobQueue>): AiJobQueue {
  return { paused: w.paused, simulated: w.simulated, jobs: w.jobs.map(aiJobFromWire) };
}
