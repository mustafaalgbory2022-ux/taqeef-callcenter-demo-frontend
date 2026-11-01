import type { Decoded } from '../../decode';
import type { wireAiConfig, wireAiJob, wireAiModel } from '../../wire/ai';

export type WireAiModel = Decoded<typeof wireAiModel>;
export type WireAiConfig = Decoded<typeof wireAiConfig>;
export type WireAiJob = Decoded<typeof wireAiJob>;

/** SYNTHETIC model catalogue. Names are placeholders; the backend reports the real local models. */
export const aiModels: WireAiModel[] = [
  m(
    'syn-asr-large',
    'transcription',
    'Synthetic speech model — large',
    '1.2',
    3.1,
    10,
    'available',
  ),
  m('syn-asr-small', 'transcription', 'Synthetic speech model — small', '1.2', 0.9, 4, 'available'),
  m(
    'syn-asr-preview',
    'transcription',
    'Synthetic speech model — preview',
    '2.0',
    3.4,
    12,
    'not_installed',
  ),
  m('syn-llm-14b', 'evaluation', 'Synthetic evaluation model — 14B', '0.9', 9.2, 16, 'available'),
  m('syn-llm-7b', 'evaluation', 'Synthetic evaluation model — 7B', '0.9', 4.8, 8, 'available'),
  m('syn-llm-70b', 'evaluation', 'Synthetic evaluation model — 70B', '0.9', 41, 80, 'incompatible'),
];

function m(
  id: string,
  kind: WireAiModel['kind'],
  name: string,
  version: string,
  size: number,
  vram: number,
  status: WireAiModel['status'],
): WireAiModel {
  return {
    id,
    kind,
    name,
    version,
    size_gb: size,
    min_vram_gb: vram,
    languages: kind === 'transcription' ? ['ar-IQ', 'ar', 'en'] : ['ar', 'en'],
    status,
    synthetic: true,
  };
}

export const defaultPrompts = {
  evaluation:
    'Evaluate this recorded customer-service call with scorecard version {scorecard_version}.\n' +
    'Use only evidence quoted from the transcript. Award actual points per criterion; mark a ' +
    'criterion not assessable when the transcript has no evidence for it.\n\nCriteria:\n{criteria}\n\n' +
    'Transcript:\n{transcript}',
  classification:
    'Classify the call reason as one of: {reasons}. State whether it is a complaint or a service ' +
    'request and give a confidence between 0 and 1.\n\nTranscript:\n{transcript}',
  summary:
    "Summarize the call in two sentences in the transcript's language. Never include phone " +
    'numbers or personal data.\n\nTranscript:\n{transcript}',
};

export const initialAiConfig: WireAiConfig = {
  version: 1,
  created_at: '2026-09-15T09:00:00+03:00',
  created_by: 'Synthetic administrator',
  simulated: true,
  transcription_model_id: 'syn-asr-large',
  evaluation_model_id: 'syn-llm-14b',
  language: 'ar-IQ',
  diarization: 'channel',
  apply_dictionary: true,
  temperature: 0,
  min_classification_confidence: 0.7,
  low_confidence_action: 'flag_for_review',
  require_evidence_quotes: true,
  scorecard_binding: 'latest',
  pinned_scorecard_version: null,
  limits: {
    max_concurrent_jobs: 2,
    max_audio_minutes: 60,
    max_queue_length: 500,
    retry_limit: 2,
    job_timeout_minutes: 30,
  },
  prompts: defaultPrompts,
  change_note: 'Initial synthetic configuration.',
};

/** Synthetic processing jobs, timed relative to "now" so the simulated queue moves. */
export function seedAiJobs(now: number): WireAiJob[] {
  const at = (minAgo: number) => new Date(now - minAgo * 60_000).toISOString();
  const job = (
    id: string,
    callId: string,
    stage: WireAiJob['stage'],
    state: WireAiJob['state'],
    minAgo: number,
    error: string | null = null,
    attempts = 1,
  ): WireAiJob => ({
    id,
    call_id: callId,
    stage,
    state,
    attempts,
    created_at: at(minAgo + 2),
    updated_at: at(minAgo),
    error,
  });
  return [
    job('job-1', 'C-1029-07', 'transcription', 'running', 0),
    job('job-2', 'C-1029-11', 'evaluation', 'queued', 1),
    job('job-3', 'C-1030-02', 'transcription', 'queued', 1),
    job('job-4', 'C-1030-05', 'classification', 'queued', 1),
    job('job-5', 'C-1028-03', 'evaluation', 'failed', 40, 'Simulated: evaluation timed out.', 1),
    job(
      'job-6',
      'C-1027-14',
      'transcription',
      'failed',
      90,
      'Simulated: audio file could not be decoded.',
      3,
    ),
    job('job-7', 'C-1027-09', 'evaluation', 'completed', 120),
    job('job-8', 'C-1027-02', 'transcription', 'completed', 150),
  ];
}
