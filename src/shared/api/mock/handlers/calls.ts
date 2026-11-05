import { registerUploadedAudio } from '../audio';
import { nextId } from '../db';
import { refreshUpload } from '../processing';
import { fail, invalid, ok, type Route } from '../router';
import type { MockState, WireCall } from '../types';

/** Contract 5.3 (CONFIRMED): WAV only, at most 100 MB. */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const CHANNEL_MAPS = ['left_agent', 'right_agent', 'none'];

export function callRoutes(state: MockState, persist: () => void): Route[] {
  const refreshAll = () => {
    if (state.calls.map((c) => refreshUpload(state, c)).some(Boolean)) persist();
  };

  return [
    {
      method: 'GET',
      pattern: '/calls',
      handler: ({ query }) => {
        refreshAll();
        const list = query.agent_id
          ? state.calls.filter((c) => c.agent_id === query.agent_id)
          : state.calls;
        return ok([...list].sort((a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at)));
      },
    },
    {
      method: 'GET',
      pattern: '/calls/:id',
      handler: ({ params }) => {
        refreshAll();
        const call = state.calls.find((c) => c.id === params.id);
        return call ? ok(call) : fail(404, 'Call not found.');
      },
    },
    {
      method: 'GET',
      pattern: '/transcripts/:revisionId/segments',
      handler: ({ params }) => {
        refreshAll();
        const transcript = Object.values(state.transcripts).find(
          (tr) => tr.transcript_revision_id === params.revisionId,
        );
        return transcript ? ok(transcript) : fail(404, 'Transcript revision not found.');
      },
    },
    {
      method: 'POST',
      pattern: '/calls',
      handler: ({ body }) => {
        if (!(body instanceof FormData)) return fail(400, 'Multipart form data expected.');
        const file = body.get('file');
        const title = String(body.get('display_name') ?? '').trim();
        const agentId = String(body.get('agent_id') ?? '');
        const channelMap = body.get('channel_map');
        if (!(file instanceof File)) return invalid('file', 'An audio file is required.');
        if (file.size > MAX_UPLOAD_BYTES) return fail(413, 'File exceeds the 100 MB limit.');
        if (!/\.wav$/i.test(file.name) && !/wav/i.test(file.type))
          return fail(415, 'Only WAV files are accepted.');
        if (!title || title.length > 200)
          return invalid('display_name', 'Display name must be 1–200 characters.');
        if (channelMap !== null && !CHANNEL_MAPS.includes(String(channelMap)))
          return invalid('channel_map', 'Unknown channel map.');
        if (!body.get('request_id')) return invalid('request_id', 'A request id is required.');
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
          current_transcript_revision_id: null,
          synthetic: true,
          simulated: true,
          source: 'upload',
          // Uploads are treated as a single mixed channel: speakers stay unknown.
          channel_layout: 'mixed',
        };
        state.calls.push(call);
        state.uploads[id] = Date.now();
        registerUploadedAudio(id, file);
        persist();
        return { status: 202, body: { call_id: id, status: 'uploaded', job_id: `job-${id}` } };
      },
    },
  ];
}
