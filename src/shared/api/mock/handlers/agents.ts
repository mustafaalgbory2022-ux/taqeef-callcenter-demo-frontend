import { nextId } from '../db';
import { created, fail, invalid, ok, type Route } from '../router';
import type { MockState, WireAgent } from '../types';

/** The masking token servers use; a config-edit value containing it is refused (§2.2.1). */
export const MASK_TOKEN = '[NUMBER]';

const ARABIC_MARKS = /[ً-ْٰـ]/g;
const FOLD: Readonly<Record<string, string>> = {
  إ: 'ا',
  أ: 'ا',
  آ: 'ا',
  ٱ: 'ا',
  ى: 'ي',
  ة: 'ه',
  ک: 'ك',
  ی: 'ي',
};

/**
 * SIMULATED `name_key` (contract v0.3 §4): casefold, collapsed whitespace, a subset of the
 * Arabic spelling-variant mappings, marks removed. The server's key table is authoritative.
 */
export const nameKey = (name: string) =>
  [...name.normalize('NFC').replace(ARABIC_MARKS, '').trim().replace(/\s+/g, ' ').toLowerCase()]
    .map((ch) => FOLD[ch] ?? ch)
    .join('');

/** Simulated subset of the as-built name rules (§4.2 reasons). */
function nameReason(name: string, state: MockState) {
  const trimmed = name.normalize('NFC').trim();
  if (trimmed.length < 1 || trimmed.length > 80) return 'name_length' as const;
  if (/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/.test(trimmed))
    return 'name_invalid_char' as const;
  if (/[0-9٠-٩۰-۹]/.test(trimmed)) return 'name_digits' as const;
  if (trimmed.split(/\s+/).some((w) => /[A-Za-z]/.test(w) && /[؀-ۿ]/.test(w)))
    return 'name_mixed_script' as const;
  if (state.agents.some((a) => nameKey(a.display_name) === nameKey(trimmed)))
    return 'name_exists' as const;
  return null;
}

/**
 * SIMULATED agent routes (contract v0.3 §4; PROPOSED): list `{items}` (active by default),
 * create and retire. There is no rename, reactivate, delete or history route.
 */
export function agentRoutes(state: MockState, persist: () => void): Route[] {
  return [
    {
      method: 'GET',
      pattern: '/agents',
      handler: ({ query }) =>
        ok({
          items:
            query.include_retired === 'true'
              ? state.agents
              : state.agents.filter((a) => a.retired_at === null),
          truncated: false,
        }),
    },
    {
      method: 'POST',
      pattern: '/agents',
      handler: ({ body }) => {
        const input = (typeof body === 'object' && body !== null ? body : {}) as {
          display_name?: unknown;
          request_id?: unknown;
        };
        if (typeof input.request_id !== 'string' || !input.request_id)
          return invalid('request_id', 'required');
        const name = typeof input.display_name === 'string' ? input.display_name : '';
        // A masked presentation value must never become a stored original (§2.2.1 write path).
        if (name.includes(MASK_TOKEN)) return invalid('display_name', 'edit_value_masked');
        const reason = nameReason(name, state);
        if (reason) return invalid('display_name', reason);
        const agent: WireAgent = {
          agent_id: nextId(state, 'agt'),
          display_name: name.normalize('NFC').trim().replace(/\s+/g, ' '),
          created_at: new Date().toISOString(),
          retired_at: null,
        };
        state.agents.push(agent);
        persist();
        return created(agent);
      },
    },
    {
      method: 'POST',
      pattern: '/agents/:id/retire',
      handler: ({ params }) => {
        const agent = state.agents.find((a) => a.agent_id === params.id);
        // As-built refusal reasons (§4.3): unknown_agent → 404, already_retired → 409.
        if (!agent)
          return fail(404, 'Agent not found.', [{ field: 'agent_id', reason: 'unknown_agent' }]);
        if (agent.retired_at !== null)
          return fail(409, 'Agent is already retired.', [
            { field: 'agent_id', reason: 'already_retired' },
          ]);
        agent.retired_at = new Date().toISOString();
        persist();
        return ok(agent);
      },
    },
  ];
}
