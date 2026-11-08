import { registerUploadedAudio } from '../audio';
import { nextId } from '../db';
import { refreshUpload } from '../processing';
import { fail, invalid, ok, type Route } from '../router';
import type { MockState, WireCall } from '../types';
import { idempotent } from '../idempotency';
import { findRevision, serializeRevisions, serializeSegments } from '../serialize';

/** Contract 5.3 (CONFIRMED): WAV only, at most 100 MB. */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const CHANNEL_MAPS = ['left_agent', 'right_agent', 'none'];

export function callRoutes(state: MockState, persist: () => void): Route[] {
  const refreshAll = () => {
    if (state.calls.map((c) => refreshUpload(state, c)).some(Boolean)) persist();
  };

  /**
   * The call as served (contract v0.3 §5.3): the agent's (masked) name, and `latest_run` =
   * the latest completed run of any scorecard version. The simulated pipeline has no jobs,
   * so `latest_job` stays null.
   */
  const withAgentName = (call: WireCall): WireCall => {
    const runs = state.evaluations
      .filter((e) => e.call_id === call.call_id)
      .sort(
        (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || (b.id > a.id ? 1 : -1),
      );
    const run = runs[0];
    const version = run && state.scorecards.find((v) => v.version === run.scorecard_version);
    return {
      ...call,
      agent_display_name:
        state.agents.find((a) => a.agent_id === call.agent_id)?.display_name ??
        call.agent_display_name,
      latest_run:
        run && version
          ? {
              run_id: run.id,
              scorecard_version_id: version.scorecard_version_id,
              scorecard_version_number: run.scorecard_version,
              outcome: run.outcome,
              display_hundredths: run.display_hundredths,
              below_threshold: run.below_threshold,
              threshold_hundredths: run.threshold_hundredths ?? 700,
              completed_at: run.created_at,
            }
          : null,
    };
  };

  return [
    {
      method: 'GET',
      pattern: '/calls',
      handler: ({ query }) => {
        refreshAll();
        // Hidden (soft-deleted) calls are excluded unless include_hidden=true (§5.3).
        const list = state.calls
          .filter((c) => !query.agent_id || c.agent_id === query.agent_id)
          .filter((c) => query.include_hidden === 'true' || !c.hidden);
        return ok({
          items: [...list]
            .sort((a, b) => Date.parse(b.uploaded_at) - Date.parse(a.uploaded_at))
            .map(withAgentName),
          truncated: false,
        });
      },
    },
    {
      method: 'GET',
      pattern: '/calls/:id',
      handler: ({ params }) => {
        refreshAll();
        const call = state.calls.find((c) => c.call_id === params.id);
        return call ? ok(withAgentName(call)) : fail(404, 'Call not found.');
      },
    },
    {
      method: 'GET',
      pattern: '/transcripts/:revisionId/segments',
      handler: ({ params }) => {
        refreshAll();
        const transcript = findRevision(state, params.revisionId ?? '');
        return transcript
          ? ok(serializeSegments(state, transcript))
          : fail(404, 'Transcript revision not found.');
      },
    },
    {
      // Revision list of one call (contract v0.3 #13).
      method: 'GET',
      pattern: '/calls/:id/transcripts',
      handler: ({ params }) => {
        refreshAll();
        if (!state.calls.some((c) => c.call_id === params.id)) return fail(404, 'Call not found.');
        return ok({ items: serializeRevisions(state, params.id ?? ''), truncated: false });
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
        if (!(file instanceof File)) return invalid('file', 'required');
        if (file.size > MAX_UPLOAD_BYTES) return fail(413, 'File exceeds the 100 MB limit.');
        if (!/\.wav$/i.test(file.name) && !/wav/i.test(file.type))
          return fail(415, 'Only WAV files are accepted.');
        if (title.length > 200) return invalid('display_name', 'too_long');
        if (channelMap !== null && !CHANNEL_MAPS.includes(String(channelMap)))
          return invalid('channel_map', 'invalid');
        if (!body.get('request_id')) return invalid('request_id', 'required');
        // Contract v0.2.1 §A: an existing, active agent is required (value never echoed).
        if (!agentId) return invalid('agent_id', 'agent_required');
        const agent = state.agents.find((a) => a.agent_id === agentId);
        if (!agent) return invalid('agent_id', 'unknown_agent');
        if (agent.retired_at !== null) return invalid('agent_id', 'already_retired');

        const id = nextId(state, 'UPL').toUpperCase();
        const call: WireCall = {
          call_id: id,
          // Server default title when none is given (contract v0.3 §5.1): never the file name.
          display_name: title || 'Untitled call',
          agent_id: agent.agent_id,
          agent_display_name: agent.display_name,
          uploaded_at: new Date().toISOString(),
          status: 'uploaded',
          rejection_reason: null,
          hidden: false,
          duration_ms: null,
          // Known after probing (see ../processing.ts).
          channels: null,
          channel_map: channelMap === null ? null : (String(channelMap) as WireCall['channel_map']),
          current_transcript_revision_id: null,
          latest_run: null,
          latest_job: null,
        };
        state.calls.push(call);
        state.uploads[id] = Date.now();
        registerUploadedAudio(id, file);
        persist();
        return { status: 202, body: { call_id: id, status: 'uploaded', job_id: `job-${id}` } };
      },
    },
    {
      // Soft delete (contract v0.3 §5.4): hidden only; runs, transcripts and audio are kept.
      method: 'DELETE',
      pattern: '/calls/:id',
      handler: ({ params, body }) => {
        const input = (typeof body === 'object' && body !== null ? body : {}) as {
          request_id?: unknown;
          reason?: unknown;
        };
        if (typeof input.request_id !== 'string' || !input.request_id)
          return invalid('request_id', 'required');
        if (
          input.reason !== undefined &&
          (typeof input.reason !== 'string' || input.reason.length > 500)
        )
          return invalid('reason', 'too_long');
        return idempotent(
          state,
          input.request_id,
          `hide:${params.id}`,
          () => {
            const call = state.calls.find((c) => c.call_id === params.id);
            if (!call) return fail(404, 'Call not found.');
            if (call.hidden) return fail(409, 'The call is already hidden.');
            call.hidden = true;
            state.visibilityEvents.push({
              call_id: call.call_id,
              hidden: true,
              at: new Date().toISOString(),
            });
            persist();
            return ok(withAgentName(call));
          },
          () => withAgentName(state.calls.find((c) => c.call_id === params.id) as WireCall),
        );
      },
    },
    {
      method: 'POST',
      pattern: '/calls/:id/restore',
      handler: ({ params, body }) => {
        const input = (typeof body === 'object' && body !== null ? body : {}) as {
          request_id?: unknown;
        };
        if (typeof input.request_id !== 'string' || !input.request_id)
          return invalid('request_id', 'required');
        return idempotent(
          state,
          input.request_id,
          `restore:${params.id}`,
          () => {
            const call = state.calls.find((c) => c.call_id === params.id);
            if (!call) return fail(404, 'Call not found.');
            if (!call.hidden) return fail(409, 'The call is not hidden.');
            call.hidden = false;
            state.visibilityEvents.push({
              call_id: call.call_id,
              hidden: false,
              at: new Date().toISOString(),
            });
            persist();
            return ok(withAgentName(call));
          },
          () => withAgentName(state.calls.find((c) => c.call_id === params.id) as WireCall),
        );
      },
    },
  ];
}
