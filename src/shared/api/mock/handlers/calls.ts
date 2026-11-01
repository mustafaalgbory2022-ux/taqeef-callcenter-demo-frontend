import { cachedAudioUrl, registerUploadedAudio, synthesizeCallAudio } from '../audio';
import { nextId } from '../db';
import { refreshUpload } from '../processing';
import { created, fail, invalid, ok, type Route } from '../router';
import { DEFAULT_REVIEW, filterCalls } from './callQueries';
import type { MockState, WireCall } from '../types';

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function callRoutes(state: MockState, persist: () => void): Route[] {
  const refreshAll = () => {
    if (state.calls.map((c) => refreshUpload(state, c)).some(Boolean)) persist();
  };

  const withReview = (call: WireCall): WireCall => ({
    ...call,
    review: state.reviews[call.id] ?? DEFAULT_REVIEW,
  });

  const withAudio = (call: WireCall): WireCall => {
    if (call.source === 'upload')
      return withReview({ ...call, audio_url: cachedAudioUrl(call.id) });
    const transcript = state.transcripts[call.id];
    const url =
      transcript && call.duration_ms
        ? synthesizeCallAudio(call.id, call.duration_ms, transcript.segments)
        : null;
    return withReview({ ...call, audio_url: url });
  };

  return [
    {
      method: 'GET',
      pattern: '/calls',
      handler: ({ query }) => {
        refreshAll();
        const all = filterCalls(state, query);
        const pageSize = Math.min(100, Math.max(1, Number(query.page_size) || 25));
        const page = Math.max(1, Number(query.page) || 1);
        const items = all.slice((page - 1) * pageSize, page * pageSize).map(withReview);
        return ok({ items, total: all.length, page, page_size: pageSize });
      },
    },
    {
      method: 'GET',
      pattern: '/calls/:id',
      handler: ({ params }) => {
        refreshAll();
        const call = state.calls.find((c) => c.id === params.id);
        return call ? ok(withAudio(call)) : fail(404, 'Call not found.');
      },
    },
    {
      method: 'PUT',
      pattern: '/calls/:id/review',
      handler: ({ params, body }) => {
        const call = state.calls.find((c) => c.id === params.id);
        if (!call) return fail(404, 'Call not found.');
        const b = (body ?? {}) as { status?: unknown; note?: unknown };
        if (
          b.status !== 'unreviewed' &&
          b.status !== 'reviewed' &&
          b.status !== 'needs_follow_up'
        ) {
          return invalid('status', 'Invalid review status.');
        }
        const note = typeof b.note === 'string' ? b.note.trim() : '';
        if (note.length > 1000) return invalid('note', 'Note must be at most 1000 characters.');
        if (b.status === 'needs_follow_up' && !note)
          return invalid('note', 'Describe the follow-up needed.');
        state.reviews[call.id] = {
          status: b.status,
          note,
          reviewed_by: 'Synthetic administrator',
          reviewed_at: new Date().toISOString(),
        };
        persist();
        return ok(withAudio(call));
      },
    },
    {
      method: 'GET',
      pattern: '/calls/:id/transcript',
      handler: ({ params }) => {
        refreshAll();
        if (!state.calls.some((c) => c.id === params.id)) return fail(404, 'Call not found.');
        const transcript = state.transcripts[params.id ?? ''];
        return transcript ? ok(transcript) : fail(409, 'Transcript is not ready yet.');
      },
    },
    {
      method: 'POST',
      pattern: '/calls',
      handler: ({ body }) => {
        if (!(body instanceof FormData)) return fail(400, 'Multipart form data expected.');
        const file = body.get('file');
        const title = String(body.get('title') ?? '').trim();
        const agentId = String(body.get('agent_id') ?? '');
        if (!(file instanceof File)) return invalid('file', 'An audio file is required.');
        if (!file.type.startsWith('audio/'))
          return invalid('file', 'Only audio files are accepted.');
        if (file.size > MAX_UPLOAD_BYTES) return invalid('file', 'File exceeds the 25 MB limit.');
        if (!title || title.length > 120)
          return invalid('title', 'Title must be 1–120 characters.');
        const agent = state.agents.find((a) => a.id === agentId);
        if (!agent || agent.status !== 'active')
          return invalid('agent_id', 'Select an active agent.');

        const id = nextId(state, 'UPL').toUpperCase();
        const call: WireCall = {
          id,
          title,
          agent_id: agent.id,
          queue_id: agent.queue_ids[0] ?? null,
          language: 'ar',
          duration_ms: null,
          recorded_at: new Date().toISOString(),
          status: 'uploaded',
          audio_url: null,
          synthetic: true,
          simulated: true,
          source: 'upload',
          // Uploads are treated as a single mixed channel: speakers stay unresolved.
          channel_layout: 'mixed',
          caller_masked: null,
          classification: null,
          review: DEFAULT_REVIEW,
        };
        state.calls.push(call);
        state.uploads[id] = Date.now();
        registerUploadedAudio(id, file);
        persist();
        return created(withAudio(call));
      },
    },
  ];
}
