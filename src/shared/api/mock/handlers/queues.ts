import { nextId } from '../db';
import { diffFields, recordAudit } from '../audit';
import { created, fail, invalid, ok, type Route } from '../router';
import type { MockState, WireQueue } from '../types';

const NUMBER = /^\d{3,6}$/;

interface QueueBody {
  number?: unknown;
  name?: { en?: unknown; ar?: unknown };
  description?: unknown;
  status?: unknown;
  confirm?: unknown;
}

const body = (b: unknown): QueueBody => (typeof b === 'object' && b !== null ? b : {});
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

function validate(state: MockState, b: QueueBody, selfId: string | null, isCreate: boolean) {
  if (isCreate || b.number !== undefined) {
    const n = text(b.number);
    if (!NUMBER.test(n)) return invalid('number', 'Queue number must be 3–6 digits.');
    if (state.queues.some((q) => q.id !== selfId && q.number === n))
      return invalid('number', 'Another queue already uses this number.');
  }
  if (isCreate || b.name !== undefined) {
    if (!text(b.name?.en)) return invalid('name_en', 'English name is required.');
    if (!text(b.name?.ar)) return invalid('name_ar', 'Arabic name is required.');
    if (text(b.name?.en).length > 60 || text(b.name?.ar).length > 60)
      return invalid('name_en', 'Names must be at most 60 characters.');
  }
  if (b.description !== undefined && text(b.description).length > 200)
    return invalid('description', 'Description must be at most 200 characters.');
  if (b.status !== undefined && b.status !== 'active' && b.status !== 'disabled')
    return invalid('status', 'Invalid status.');
  return null;
}

const KEYS = ['number', 'name', 'description', 'status'] as const;

export function queueRoutes(state: MockState, persist: () => void): Route[] {
  const find = (id: string | undefined) => state.queues.find((q) => q.id === id);
  return [
    {
      method: 'POST',
      pattern: '/queues',
      handler: ({ body: raw }) => {
        const b = body(raw);
        const error = validate(state, b, null, true);
        if (error) return error;
        const now = new Date().toISOString();
        const queue: WireQueue = {
          id: nextId(state, 'q'),
          number: text(b.number),
          name: { en: text(b.name?.en), ar: text(b.name?.ar) },
          description: text(b.description),
          status: 'active',
          synthetic: true,
          created_at: now,
          updated_at: now,
        };
        state.queues.push(queue);
        recordAudit(state, {
          resource: 'queue',
          resourceId: queue.id,
          action: 'created',
          summary: `Queue ${queue.number} created`,
          changes: diffFields(null, { ...queue, name: queue.name.en }, KEYS),
        });
        persist();
        return created(queue);
      },
    },
    {
      method: 'PATCH',
      pattern: '/queues/:id',
      handler: ({ params, body: raw }) => {
        const queue = find(params.id);
        if (!queue) return fail(404, 'Queue not found.');
        const b = body(raw);
        const error = validate(state, b, queue.id, false);
        if (error) return error;
        const next: WireQueue = {
          ...queue,
          number: b.number === undefined ? queue.number : text(b.number),
          name: b.name === undefined ? queue.name : { en: text(b.name.en), ar: text(b.name.ar) },
          description: b.description === undefined ? queue.description : text(b.description),
          status: b.status === 'disabled' || b.status === 'active' ? b.status : queue.status,
        };
        const destructive = next.number !== queue.number || next.status === 'disabled';
        const changed =
          destructive ||
          next.status !== queue.status ||
          JSON.stringify(next.name) !== JSON.stringify(queue.name) ||
          next.description !== queue.description;
        if (!changed) return ok(queue);
        if (destructive && b.confirm !== true) {
          return fail(409, 'This change affects PBX mapping or availability. Confirm it first.');
        }
        const changes = diffFields(
          { ...queue, name: `${queue.name.en} / ${queue.name.ar}` },
          { ...next, name: `${next.name.en} / ${next.name.ar}` },
          KEYS,
        );
        const statusOnly = changes.length === 1 && changes[0]?.field === 'status';
        next.updated_at = new Date().toISOString();
        Object.assign(queue, next);
        recordAudit(state, {
          resource: 'queue',
          resourceId: queue.id,
          action: statusOnly ? (queue.status === 'disabled' ? 'disabled' : 'enabled') : 'updated',
          summary: `Queue ${queue.number} ${statusOnly ? queue.status : 'updated'}`,
          changes,
        });
        persist();
        return ok(queue);
      },
    },
    {
      method: 'PUT',
      pattern: '/queues/:id/agents',
      handler: ({ params, body: raw }) => {
        const queue = find(params.id);
        if (!queue) return fail(404, 'Queue not found.');
        const b = (typeof raw === 'object' && raw !== null ? raw : {}) as {
          agent_ids?: unknown;
          confirm?: unknown;
        };
        if (!Array.isArray(b.agent_ids) || !b.agent_ids.every((id) => typeof id === 'string'))
          return invalid('agent_ids', 'agent_ids must be a list.');
        const wanted = new Set(b.agent_ids as string[]);
        if ([...wanted].some((id) => !state.agents.some((a) => a.id === id)))
          return invalid('agent_ids', 'Unknown agent.');
        if (queue.status === 'disabled' && wanted.size > 0) {
          const current = state.agents.filter((a) => a.queue_ids.includes(queue.id));
          if ([...wanted].some((id) => !current.some((a) => a.id === id)))
            return invalid('agent_ids', 'Agents cannot be added to a disabled queue.');
        }
        const removed = state.agents.filter(
          (a) => a.queue_ids.includes(queue.id) && !wanted.has(a.id),
        );
        const added = state.agents.filter(
          (a) => !a.queue_ids.includes(queue.id) && wanted.has(a.id),
        );
        if (removed.length > 0 && b.confirm !== true)
          return fail(409, 'Removing agents from a queue must be confirmed.');
        if (removed.length + added.length === 0) return ok(queue);
        const now = new Date().toISOString();
        for (const agent of [...added, ...removed]) {
          const before = agent.queue_ids;
          agent.queue_ids = wanted.has(agent.id)
            ? [...before, queue.id]
            : before.filter((id) => id !== queue.id);
          agent.updated_at = now;
          (state.audit[agent.id] ??= []).unshift({
            id: nextId(state, 'audit'),
            action: 'updated',
            actor: 'Synthetic administrator',
            at: now,
            changes: [
              { field: 'queue_ids', before: String(before), after: String(agent.queue_ids) },
            ],
          });
        }
        const names = (list: typeof added) => list.map((a) => a.display_name).join(', ') || '—';
        recordAudit(state, {
          resource: 'queue',
          resourceId: queue.id,
          action: 'assigned',
          summary: `Queue ${queue.number} assignments changed`,
          changes: [
            { field: 'agents_added', before: null, after: names(added) },
            { field: 'agents_removed', before: names(removed), after: null },
          ].filter((c) => (c.after ?? c.before) !== '—'),
        });
        queue.updated_at = now;
        persist();
        return ok(queue);
      },
    },
  ];
}

export function auditRoutes(state: MockState): Route[] {
  return [
    {
      method: 'GET',
      pattern: '/admin/audit',
      handler: ({ query }) =>
        ok(
          state.adminAudit.filter(
            (e) =>
              (!query.resource || e.resource === query.resource) &&
              (!query.resource_id || e.resource_id === query.resource_id),
          ),
        ),
    },
  ];
}
