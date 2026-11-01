import type { AdminAuditAction, AdminResource } from '@/shared/types/domain';
import type { MockState, WireAdminAudit } from './types';

export const ACTOR = 'Synthetic administrator';
export const SUPERVISOR = 'Synthetic supervisor';

type Change = WireAdminAudit['changes'][number];

/** Append one audit record (newest first). Records are never edited or removed. */
export function recordAudit(
  state: MockState,
  entry: {
    resource: AdminResource;
    resourceId: string | null;
    action: AdminAuditAction;
    summary: string;
    changes?: Change[];
    actor?: string;
    at?: string;
  },
): WireAdminAudit {
  state.seq += 1;
  const record: WireAdminAudit = {
    id: `adm-${state.seq}`,
    resource: entry.resource,
    resource_id: entry.resourceId,
    action: entry.action,
    actor: entry.actor ?? ACTOR,
    at: entry.at ?? new Date().toISOString(),
    summary: entry.summary,
    changes: entry.changes ?? [],
    simulated: true,
  };
  state.adminAudit.unshift(record);
  return record;
}

const show = (v: unknown): string | null =>
  v === undefined || v === null ? null : typeof v === 'string' ? v : JSON.stringify(v);

/** Field-level before/after for the listed keys (values serialised for display). */
export function diffFields<T extends object>(
  before: T | null,
  after: T,
  keys: readonly (keyof T & string)[],
): Change[] {
  return keys.flatMap((k) => {
    const b = before ? show(before[k]) : null;
    const a = show(after[k]);
    return a === b ? [] : [{ field: k, before: b, after: a }];
  });
}

/** Seed history so audit views are never empty in the synthetic demo. */
export function seedAdminAudit(state: MockState): WireAdminAudit[] {
  return state.queues.map((q, i) => ({
    id: `adm-seed-q${i + 1}`,
    resource: 'queue' as const,
    resource_id: q.id,
    action: 'created' as const,
    actor: ACTOR,
    at: q.created_at ?? '2026-08-01T09:00:00+03:00',
    summary: `Queue ${q.number} created`,
    changes: [
      { field: 'number', before: null, after: q.number },
      { field: 'name', before: null, after: q.name.en },
    ],
    simulated: true,
  }));
}
