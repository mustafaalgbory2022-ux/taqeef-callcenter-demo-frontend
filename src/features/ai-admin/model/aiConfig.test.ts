import { describe, expect, it } from 'vitest';
import type { AiConfigVersion, AiJob, AiModel } from '@/shared/types/domain';
import { checkPlaceholders } from '@/shared/utils/aiRules';
import { canRetry, changedSettings, jobCounts, toAiDraft, validateAiConfig } from './aiConfig';

const model = (
  id: string,
  kind: AiModel['kind'],
  status: AiModel['status'] = 'available',
): AiModel => ({
  id,
  kind,
  name: id,
  version: '1',
  sizeGb: 1,
  minVramGb: 1,
  languages: [],
  status,
  synthetic: true,
});
const models = [
  model('asr', 'transcription'),
  model('llm', 'evaluation'),
  model('big', 'evaluation', 'incompatible'),
];

const version: AiConfigVersion = {
  version: 1,
  createdAt: '',
  createdBy: '',
  simulated: true,
  transcriptionModelId: 'asr',
  evaluationModelId: 'llm',
  language: 'ar-IQ',
  diarization: 'channel',
  applyDictionary: true,
  temperature: 0,
  minClassificationConfidence: 0.7,
  lowConfidenceAction: 'flag_for_review',
  requireEvidenceQuotes: true,
  scorecardBinding: 'latest',
  pinnedScorecardVersion: null,
  limits: {
    maxConcurrentJobs: 2,
    maxAudioMinutes: 60,
    maxQueueLength: 500,
    retryLimit: 2,
    jobTimeoutMinutes: 30,
  },
  prompts: {
    evaluation: 'v{scorecard_version} {criteria} {transcript}',
    classification: '{reasons} {transcript}',
    summary: '{transcript}',
  },
  changeNote: 'x',
};

describe('AI configuration rules', () => {
  it('accepts a valid draft once a change note is given', () => {
    const draft = toAiDraft(version);
    expect(draft.changeNote).toBe('');
    expect(validateAiConfig(draft, models, [1, 2])).toEqual({
      changeNote: 'aiAdmin.errors.changeNote',
    });
    expect(validateAiConfig({ ...draft, changeNote: 'Tuned limits' }, models, [1, 2])).toEqual({});
  });

  it('rejects unavailable models, out-of-range limits and an unknown pinned version', () => {
    const draft = {
      ...toAiDraft(version),
      changeNote: 'Change',
      evaluationModelId: 'big',
      limits: { ...version.limits, maxConcurrentJobs: 9, retryLimit: 1.5 },
      scorecardBinding: 'pinned' as const,
      pinnedScorecardVersion: 7,
    };
    expect(validateAiConfig(draft, models, [1, 2])).toEqual({
      evaluationModelId: 'aiAdmin.errors.modelUnavailable',
      'limits.maxConcurrentJobs': 'aiAdmin.errors.limit',
      'limits.retryLimit': 'aiAdmin.errors.limit',
      pinnedScorecardVersion: 'aiAdmin.errors.pinnedVersion',
    });
  });

  it('checks required and unknown prompt placeholders', () => {
    expect(checkPlaceholders('evaluation', 'Score {transcript} using {rubric}')).toEqual({
      missing: ['criteria', 'scorecard_version'],
      unknown: ['rubric'],
    });
    expect(checkPlaceholders('summary', '{transcript} {dictionary}')).toEqual({
      missing: [],
      unknown: [],
    });
    const draft = {
      ...toAiDraft(version),
      changeNote: 'Prompt',
      prompts: { ...version.prompts, summary: 'none' },
    };
    expect(validateAiConfig(draft, models, [1])).toEqual({
      'prompts.summary': 'aiAdmin.errors.promptMissing',
    });
  });

  it('lists changed settings and job actions', () => {
    const a = toAiDraft(version);
    expect(changedSettings(a, { ...a, temperature: 0.2, changeNote: 'n' })).toEqual([
      'temperature',
    ]);
    const job = (state: AiJob['state'], attempts: number): AiJob => ({
      id: 'j',
      callId: 'c',
      stage: 'evaluation',
      state,
      attempts,
      createdAt: '',
      updatedAt: '',
      error: null,
    });
    expect(canRetry(job('failed', 2), 2)).toBe(true);
    expect(canRetry(job('failed', 3), 2)).toBe(false);
    expect(jobCounts([job('failed', 1), job('queued', 1), job('queued', 1)])).toMatchObject({
      failed: 1,
      queued: 2,
    });
  });
});
