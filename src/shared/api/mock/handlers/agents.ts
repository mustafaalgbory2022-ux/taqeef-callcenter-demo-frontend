import { EXTENSION_PATTERN } from '@/shared/utils/validation';
import { nextId } from '../db';
import { created, fail, invalid, ok, type Route } from '../router';
import type { MockState, WireAgent, WireAudit } from '../types';

const ACTOR = 'Synthetic administrator';
type Patch = Partial<Pick<WireAgent, 'display_name' | 'extension' | 'status'>>;

function readPatch(body: unknown): Patch {
  if (typeof body !== 'object' || body === null) return {};
  return body as Patch;
}

function validate(state: MockState, patch: Patch, selfId: string | null, isCreate: boolean) {
  const name = patch.display_name;
  if (isCreate || name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0)
      return invalid('display_name', 'required');
    if (name.length > 80) return invalid('display_name', 'too_long');
  }
  const ext = patch.extension;
  if (isCreate || ext !== undefined) {
    if (typeof ext !== 'string' || !EXTENSION_PATTERN.test(ext)) {
      return invalid('extension', 'invalid_format');
    }
    const taken = state.agents.some(
      (a) => a.id !== selfId && a.extension.toLowerCase() === ext.toLowerCase(),
    );
    if (taken) return invalid('extension', 'duplicate');
  }
  if (patch.status !== undefined && patch.status !== 'active' && patch.status !== 'inactive') {
    return invalid('status', 'invalid');
  }
  return null;
}

function diff(before: WireAgent, after: WireAgent): WireAudit['changes'] {
  const fields = ['display_name', 'extension', 'status'] as const;
  return fields.flatMap((f) => {
    const b = String(before[f]);
    const a = String(after[f]);
    return a === b ? [] : [{ field: f, before: b, after: a }];
  });
}

export function agentRoutes(state: MockState, persist: () => void): Route[] {
  return [
    { method: 'GET', pattern: '/agents', handler: () => ok(state.agents) },
    {
      method: 'POST',
      pattern: '/agents',
      handler: ({ body }) => {
        const patch = readPatch(body);
        const error = validate(state, patch, null, true);
        if (error) return error;
        const now = new Date().toISOString();
        const agent: WireAgent = {
          id: nextId(state, 'agt'),
          display_name: (patch.display_name ?? '').trim(),
          extension: (patch.extension ?? '').trim(),
          status: patch.status ?? 'active',
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
            changes: diff({ ...agent, display_name: '', extension: '' }, agent),
          },
        ];
        persist();
        return created(agent);
      },
    },
    {
      method: 'PATCH',
      pattern: '/agents/:id',
      handler: ({ params, body }) => {
        const current = state.agents.find((a) => a.id === params.id);
        if (!current) return fail(404, 'Agent not found.');
        const patch = readPatch(body);
        const error = validate(state, patch, current.id, false);
        if (error) return error;
        const next: WireAgent = { ...current, ...patch, updated_at: new Date().toISOString() };
        const changes = diff(current, next);
        if (changes.length === 0) return ok(current);
        const statusOnly = changes.length === 1 && changes[0]?.field === 'status';
        const action = statusOnly
          ? next.status === 'inactive'
            ? 'disabled'
            : 'enabled'
          : 'updated';
        Object.assign(current, next);
        (state.audit[current.id] ??= []).unshift({
          id: nextId(state, 'audit'),
          action,
          actor: ACTOR,
          at: next.updated_at,
          changes,
        });
        persist();
        return ok(current);
      },
    },
    {
      method: 'GET',
      pattern: '/agents/:id/history',
      handler: ({ params }) =>
        state.agents.some((a) => a.id === params.id)
          ? ok(state.audit[params.id ?? ''] ?? [])
          : fail(404, 'Agent not found.'),
    },
  ];
}
