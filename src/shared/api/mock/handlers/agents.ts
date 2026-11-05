import { EXTENSION_PATTERN } from '@/shared/utils/validation';
import { nextId } from '../db';
import { created, fail, invalid, ok, type Route } from '../router';
import type { MockState, WireAgent } from '../types';

/** Audit records hold ids only, never names (contract v0.2.1 §A). */
const ACTOR = 'operator';

const normalize = (name: string) => name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

interface CreateBody {
  display_name?: unknown;
  extension?: unknown;
}

function validate(state: MockState, body: CreateBody) {
  const name = body.display_name;
  if (typeof name !== 'string' || name.trim().length === 0)
    return invalid('display_name', 'required');
  if (name.trim().length > 80) return invalid('display_name', 'too_long');
  // Unique across all agents, retired included (names are never reused).
  if (state.agents.some((a) => normalize(a.display_name) === normalize(name)))
    return invalid('display_name', 'name_exists');
  const ext = body.extension;
  if (ext !== undefined && ext !== null && ext !== '') {
    if (typeof ext !== 'string' || !EXTENSION_PATTERN.test(ext))
      return invalid('extension', 'invalid_format');
    if (state.agents.some((a) => a.extension?.toLowerCase() === ext.toLowerCase()))
      return invalid('extension', 'duplicate');
  }
  return null;
}

/**
 * SIMULATED agent routes (contract v0.2.1 §A, PROPOSED): list (active by default), create and
 * retire. There is no rename, reactivate or delete route.
 */
export function agentRoutes(state: MockState, persist: () => void): Route[] {
  return [
    {
      method: 'GET',
      pattern: '/agents',
      handler: ({ query }) =>
        ok(
          query.include_retired === 'true'
            ? state.agents
            : state.agents.filter((a) => a.status === 'active'),
        ),
    },
    {
      method: 'POST',
      pattern: '/agents',
      handler: ({ body }) => {
        const input = (typeof body === 'object' && body !== null ? body : {}) as CreateBody;
        const error = validate(state, input);
        if (error) return error;
        const now = new Date().toISOString();
        const agent: WireAgent = {
          id: nextId(state, 'agt'),
          display_name: String(input.display_name).trim(),
          extension:
            typeof input.extension === 'string' && input.extension ? input.extension : null,
          status: 'active',
          synthetic: true,
          created_at: now,
          updated_at: now,
        };
        state.agents.push(agent);
        state.audit[agent.id] = [
          {
            id: nextId(state, 'audit'),
            action: 'created',
            actor: ACTOR,
            at: now,
            changes: [{ field: 'agent_id', before: null, after: agent.id }],
          },
        ];
        persist();
        return created(agent);
      },
    },
    {
      method: 'POST',
      pattern: '/agents/:id/retire',
      handler: ({ params }) => {
        const agent = state.agents.find((a) => a.id === params.id);
        if (!agent) return fail(404, 'Agent not found.');
        if (agent.status === 'retired') return fail(409, 'Agent is already retired.');
        agent.status = 'retired';
        agent.updated_at = new Date().toISOString();
        (state.audit[agent.id] ??= []).unshift({
          id: nextId(state, 'audit'),
          action: 'retired',
          actor: ACTOR,
          at: agent.updated_at,
          changes: [{ field: 'status', before: 'active', after: 'retired' }],
        });
        persist();
        return ok(agent);
      },
    },
    {
      // PROVISIONAL: audit history route is not defined by the contract.
      method: 'GET',
      pattern: '/agents/:id/history',
      handler: ({ params }) =>
        state.agents.some((a) => a.id === params.id)
          ? ok(state.audit[params.id ?? ''] ?? [])
          : fail(404, 'Agent not found.'),
    },
  ];
}
