import {
  checkPlaceholders,
  CONFIDENCE_RANGE,
  inRange,
  isWholeInRange,
  LIMIT_RANGES,
  PROMPT_MAX_LENGTH,
  TEMPERATURE_RANGE,
} from '@/shared/utils/aiRules';
import { diffFields, recordAudit } from '../audit';
import type { WireAiConfig } from '../fixtures/ai';
import { created, fail, invalid, ok, type Route } from '../router';
import type { MockState } from '../types';

const LOADING_MS = 4000;
const RUN_MS = 15_000;

const current = (state: MockState): WireAiConfig => {
  const c = state.ai.configs.at(-1);
  if (!c) throw new Error('No AI config');
  return c;
};

const LIMIT_WIRE: Record<keyof typeof LIMIT_RANGES, keyof WireAiConfig['limits']> = {
  maxConcurrentJobs: 'max_concurrent_jobs',
  maxAudioMinutes: 'max_audio_minutes',
  maxQueueLength: 'max_queue_length',
  retryLimit: 'retry_limit',
  jobTimeoutMinutes: 'job_timeout_minutes',
};

function validate(state: MockState, d: Partial<WireAiConfig>) {
  const model = (id: unknown, kind: 'transcription' | 'evaluation', field: string) => {
    const found = state.ai.models.find((m) => m.id === id);
    if (!found || found.kind !== kind) return invalid(field, 'Unknown model.');
    if (found.status !== 'available') return invalid(field, 'This model is not available locally.');
    return null;
  };
  const err =
    model(d.transcription_model_id, 'transcription', 'transcription_model_id') ??
    model(d.evaluation_model_id, 'evaluation', 'evaluation_model_id');
  if (err) return err;
  if (!['ar-IQ', 'ar', 'auto'].includes(String(d.language)))
    return invalid('language', 'Invalid language.');
  if (!['channel', 'model', 'off'].includes(String(d.diarization)))
    return invalid('diarization', 'Invalid diarization mode.');
  if (typeof d.temperature !== 'number' || !inRange(d.temperature, TEMPERATURE_RANGE))
    return invalid('temperature', 'Temperature must be between 0 and 1.');
  if (
    typeof d.min_classification_confidence !== 'number' ||
    !inRange(d.min_classification_confidence, CONFIDENCE_RANGE)
  )
    return invalid('min_classification_confidence', 'Confidence must be between 0.5 and 0.99.');
  if (d.scorecard_binding === 'pinned') {
    if (!state.scorecards.some((v) => v.version === d.pinned_scorecard_version))
      return invalid('pinned_scorecard_version', 'Select an existing scorecard version.');
  } else if (d.scorecard_binding !== 'latest') {
    return invalid('scorecard_binding', 'Invalid scorecard binding.');
  }
  for (const [key, range] of Object.entries(LIMIT_RANGES) as [
    keyof typeof LIMIT_RANGES,
    readonly [number, number],
  ][]) {
    const wire = LIMIT_WIRE[key];
    const v = d.limits?.[wire];
    if (typeof v !== 'number' || !isWholeInRange(v, range))
      return invalid(wire, `Must be a whole number from ${range[0]} to ${range[1]}.`);
  }
  for (const kind of ['evaluation', 'classification', 'summary'] as const) {
    const text = d.prompts?.[kind];
    if (typeof text !== 'string' || !text.trim())
      return invalid(`prompt_${kind}`, 'Prompt is required.');
    if (text.length > PROMPT_MAX_LENGTH) return invalid(`prompt_${kind}`, 'Prompt is too long.');
    const check = checkPlaceholders(kind, text);
    if (check.missing.length)
      return invalid(`prompt_${kind}`, `Missing placeholder: {${check.missing.join('}, {')}}.`);
    if (check.unknown.length)
      return invalid(`prompt_${kind}`, `Unknown placeholder: {${check.unknown.join('}, {')}}.`);
  }
  if (typeof d.change_note !== 'string' || d.change_note.trim().length < 5)
    return invalid('change_note', 'Describe the change (at least 5 characters).');
  return null;
}

const COMPARED = [
  'transcription_model_id',
  'evaluation_model_id',
  'language',
  'diarization',
  'apply_dictionary',
  'temperature',
  'min_classification_confidence',
  'low_confidence_action',
  'require_evidence_quotes',
  'scorecard_binding',
  'pinned_scorecard_version',
  'limits',
  'prompts',
] as const;

/** Advance the simulated queue: finish long-running jobs, then start queued ones. */
function advance(state: MockState, now: number) {
  if (state.ai.paused) return;
  for (const job of state.ai.jobs) {
    if (job.state === 'running' && now - Date.parse(job.updated_at) > RUN_MS) {
      job.state = 'completed';
      job.updated_at = new Date(now).toISOString();
    }
  }
  const capacity = current(state).limits.max_concurrent_jobs;
  let running = state.ai.jobs.filter((j) => j.state === 'running').length;
  for (const job of [...state.ai.jobs].reverse()) {
    if (running >= capacity) break;
    if (job.state === 'queued') {
      job.state = 'running';
      job.updated_at = new Date(now).toISOString();
      running += 1;
    }
  }
}

export function aiRoutes(state: MockState, persist: () => void): Route[] {
  const queue = () => ({ paused: state.ai.paused, simulated: true, jobs: state.ai.jobs });
  const jobAction = (id: string | undefined, action: 'retried' | 'cancelled') => {
    const job = state.ai.jobs.find((j) => j.id === id);
    if (!job) return fail(404, 'Job not found.');
    if (action === 'retried') {
      if (job.state !== 'failed') return fail(409, 'Only failed jobs can be retried.');
      if (job.attempts > current(state).limits.retry_limit)
        return fail(409, 'The retry limit for this job has been reached.');
      job.state = 'queued';
      job.attempts += 1;
      job.error = null;
    } else {
      if (job.state !== 'queued' && job.state !== 'running')
        return fail(409, 'Only queued or running jobs can be cancelled.');
      job.state = 'cancelled';
    }
    job.updated_at = new Date().toISOString();
    recordAudit(state, {
      resource: 'ai_jobs',
      resourceId: job.id,
      action,
      summary: `Job ${job.id} (${job.call_id}, ${job.stage}) ${action}`,
    });
    persist();
    return ok(queue());
  };

  return [
    { method: 'GET', pattern: '/ai/models', handler: () => ok(state.ai.models) },
    {
      method: 'GET',
      pattern: '/ai/status',
      handler: () => {
        const cfg = current(state);
        const now = Date.now();
        const service = (kind: 'transcription' | 'evaluation') => {
          const loading = now - state.ai.loadedAt[kind] < LOADING_MS;
          return {
            kind,
            state: loading ? 'loading' : 'ready',
            model_id:
              kind === 'transcription' ? cfg.transcription_model_id : cfg.evaluation_model_id,
            message: loading
              ? 'Simulated: switching model.'
              : 'Simulated: no model runs in the browser.',
          };
        };
        return ok({
          generated_at: new Date(now).toISOString(),
          simulated: true,
          config_version: cfg.version,
          services: [service('transcription'), service('evaluation')],
        });
      },
    },
    { method: 'GET', pattern: '/ai/config/current', handler: () => ok(current(state)) },
    {
      method: 'GET',
      pattern: '/ai/config/versions',
      handler: () => ok([...state.ai.configs].reverse()),
    },
    {
      method: 'POST',
      pattern: '/ai/config/versions',
      handler: ({ body }) => {
        const d = (typeof body === 'object' && body !== null ? body : {}) as Partial<WireAiConfig>;
        const error = validate(state, d);
        if (error) return error;
        const before = current(state);
        const next: WireAiConfig = {
          ...(d as WireAiConfig),
          change_note: (d.change_note ?? '').trim(),
          version: before.version + 1,
          created_at: new Date().toISOString(),
          created_by: 'Synthetic administrator',
          simulated: true,
        };
        const changes = diffFields(before, next, COMPARED);
        if (changes.length === 0) return fail(409, 'No changes compared with the current version.');
        const now = Date.now();
        if (next.transcription_model_id !== before.transcription_model_id)
          state.ai.loadedAt.transcription = now;
        if (next.evaluation_model_id !== before.evaluation_model_id)
          state.ai.loadedAt.evaluation = now;
        state.ai.configs.push(next);
        recordAudit(state, {
          resource: 'ai_config',
          resourceId: `v${next.version}`,
          action: 'version_saved',
          summary: `AI configuration v${next.version}: ${next.change_note}`,
          changes: changes.map((c) =>
            c.field === 'prompts' || c.field === 'limits'
              ? { field: c.field, before: 'previous', after: 'changed' }
              : c,
          ),
        });
        persist();
        return created(next);
      },
    },
    {
      method: 'GET',
      pattern: '/ai/jobs',
      handler: () => {
        advance(state, Date.now());
        return ok(queue());
      },
    },
    {
      method: 'POST',
      pattern: '/ai/jobs/pause',
      handler: () => {
        if (state.ai.paused) return ok(queue());
        state.ai.paused = true;
        recordAudit(state, {
          resource: 'ai_jobs',
          resourceId: null,
          action: 'paused',
          summary: 'Processing queue paused',
        });
        persist();
        return ok(queue());
      },
    },
    {
      method: 'POST',
      pattern: '/ai/jobs/resume',
      handler: () => {
        if (!state.ai.paused) return ok(queue());
        state.ai.paused = false;
        recordAudit(state, {
          resource: 'ai_jobs',
          resourceId: null,
          action: 'resumed',
          summary: 'Processing queue resumed',
        });
        persist();
        return ok(queue());
      },
    },
    {
      method: 'POST',
      pattern: '/ai/jobs/:id/retry',
      handler: ({ params }) => jobAction(params.id, 'retried'),
    },
    {
      method: 'POST',
      pattern: '/ai/jobs/:id/cancel',
      handler: ({ params }) => jobAction(params.id, 'cancelled'),
    },
  ];
}
