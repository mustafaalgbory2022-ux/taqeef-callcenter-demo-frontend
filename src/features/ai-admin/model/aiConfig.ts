import type { MessageKey } from '@/shared/i18n/translate';
import type {
  AiConfigDraft,
  AiConfigVersion,
  AiJob,
  AiLimits,
  AiModel,
  AiModelKind,
  AiPromptKind,
} from '@/shared/types/domain';
import {
  checkPlaceholders,
  CONFIDENCE_RANGE,
  inRange,
  isWholeInRange,
  LIMIT_RANGES,
  PROMPT_MAX_LENGTH,
  TEMPERATURE_RANGE,
} from '@/shared/utils/aiRules';

export const PROMPT_KINDS: readonly AiPromptKind[] = ['evaluation', 'classification', 'summary'];
export const LIMIT_KEYS = Object.keys(LIMIT_RANGES) as (keyof AiLimits)[];

export type AiField =
  | 'transcriptionModelId'
  | 'evaluationModelId'
  | 'temperature'
  | 'minClassificationConfidence'
  | 'pinnedScorecardVersion'
  | 'changeNote'
  | `limits.${keyof AiLimits}`
  | `prompts.${AiPromptKind}`;

export type AiErrors = Partial<Record<AiField, MessageKey>>;

export function toAiDraft(v: AiConfigVersion): AiConfigDraft {
  return {
    transcriptionModelId: v.transcriptionModelId,
    evaluationModelId: v.evaluationModelId,
    language: v.language,
    diarization: v.diarization,
    applyDictionary: v.applyDictionary,
    temperature: v.temperature,
    minClassificationConfidence: v.minClassificationConfidence,
    lowConfidenceAction: v.lowConfidenceAction,
    requireEvidenceQuotes: v.requireEvidenceQuotes,
    scorecardBinding: v.scorecardBinding,
    pinnedScorecardVersion: v.pinnedScorecardVersion,
    limits: v.limits,
    prompts: v.prompts,
    changeNote: '',
  };
}

export function selectableModels(models: readonly AiModel[], kind: AiModelKind): AiModel[] {
  return models.filter((m) => m.kind === kind);
}

/** Client-side validation mirroring the server; the server stays authoritative. */
export function validateAiConfig(
  d: AiConfigDraft,
  models: readonly AiModel[],
  scorecardVersions: readonly number[],
): AiErrors {
  const errors: AiErrors = {};
  const model = (id: string, kind: AiModelKind): MessageKey | null => {
    const m = models.find((x) => x.id === id && x.kind === kind);
    if (!m) return 'aiAdmin.errors.modelRequired';
    return m.status === 'available' ? null : 'aiAdmin.errors.modelUnavailable';
  };
  const t = model(d.transcriptionModelId, 'transcription');
  if (t) errors.transcriptionModelId = t;
  const e = model(d.evaluationModelId, 'evaluation');
  if (e) errors.evaluationModelId = e;
  if (!inRange(d.temperature, TEMPERATURE_RANGE)) errors.temperature = 'aiAdmin.errors.temperature';
  if (!inRange(d.minClassificationConfidence, CONFIDENCE_RANGE))
    errors.minClassificationConfidence = 'aiAdmin.errors.confidence';
  if (
    d.scorecardBinding === 'pinned' &&
    (d.pinnedScorecardVersion === null || !scorecardVersions.includes(d.pinnedScorecardVersion))
  )
    errors.pinnedScorecardVersion = 'aiAdmin.errors.pinnedVersion';
  for (const key of LIMIT_KEYS) {
    if (!isWholeInRange(d.limits[key], LIMIT_RANGES[key]))
      errors[`limits.${key}`] = 'aiAdmin.errors.limit';
  }
  for (const kind of PROMPT_KINDS) {
    const text = d.prompts[kind];
    const check = checkPlaceholders(kind, text);
    if (!text.trim()) errors[`prompts.${kind}`] = 'aiAdmin.errors.promptRequired';
    else if (text.length > PROMPT_MAX_LENGTH)
      errors[`prompts.${kind}`] = 'aiAdmin.errors.promptTooLong';
    else if (check.missing.length > 0) errors[`prompts.${kind}`] = 'aiAdmin.errors.promptMissing';
    else if (check.unknown.length > 0) errors[`prompts.${kind}`] = 'aiAdmin.errors.promptUnknown';
  }
  if (d.changeNote.trim().length < 5) errors.changeNote = 'aiAdmin.errors.changeNote';
  return errors;
}

/** Server (snake_case) field names → form fields. */
export const AI_SERVER_FIELD: Record<string, AiField> = {
  transcription_model_id: 'transcriptionModelId',
  evaluation_model_id: 'evaluationModelId',
  temperature: 'temperature',
  min_classification_confidence: 'minClassificationConfidence',
  pinned_scorecard_version: 'pinnedScorecardVersion',
  change_note: 'changeNote',
  max_concurrent_jobs: 'limits.maxConcurrentJobs',
  max_audio_minutes: 'limits.maxAudioMinutes',
  max_queue_length: 'limits.maxQueueLength',
  retry_limit: 'limits.retryLimit',
  job_timeout_minutes: 'limits.jobTimeoutMinutes',
  prompt_evaluation: 'prompts.evaluation',
  prompt_classification: 'prompts.classification',
  prompt_summary: 'prompts.summary',
};

/** Top-level settings that differ between two drafts (change note excluded). */
export function changedSettings(a: AiConfigDraft, b: AiConfigDraft): (keyof AiConfigDraft)[] {
  const keys = Object.keys(a).filter((k) => k !== 'changeNote') as (keyof AiConfigDraft)[];
  return keys.filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
}

export const canRetry = (job: AiJob, retryLimit: number) =>
  job.state === 'failed' && job.attempts <= retryLimit;
export const canCancel = (job: AiJob) => job.state === 'queued' || job.state === 'running';

/** Count of jobs per state for the queue summary. */
export function jobCounts(jobs: readonly AiJob[]): Record<AiJob['state'], number> {
  const counts = { queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
  for (const j of jobs) counts[j.state] += 1;
  return counts;
}
