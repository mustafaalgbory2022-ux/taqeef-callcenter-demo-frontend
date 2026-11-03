import type { AdminAuditEntry, AuditQuery } from '@/shared/types/domain';
import type { Sheet } from '@/shared/utils/xlsx';

export const AUDIT_PAGE_SIZE = 25;

/** Resources grouped for the filter: administration vs security events. */
export const SECURITY_RESOURCES = ['user', 'session', 'security_policy', 'auth'] as const;

export function isValidAuditRange(q: AuditQuery): boolean {
  return !q.from || !q.to || q.from <= q.to;
}

export function pageOf<T>(items: readonly T[], page: number, size = AUDIT_PAGE_SIZE): T[] {
  return items.slice((page - 1) * size, page * size);
}

/** Spreadsheet rows for an audit export. Values are exported exactly as recorded. */
export function auditSheet(
  name: string,
  headers: readonly string[],
  entries: readonly AdminAuditEntry[],
): Sheet {
  return {
    name,
    rows: [
      headers,
      ...entries.map((e) => [
        e.at,
        e.actor,
        e.action,
        e.resource,
        e.resourceId ?? '',
        e.result,
        e.correlationId,
        e.summary,
        e.changes.map((c) => `${c.field}: ${c.before ?? '—'} → ${c.after ?? '—'}`).join('; '),
        e.simulated ? 'simulated' : '',
      ]),
    ],
  };
}

/** Removes empty filter values so the URL/request stays minimal. */
export function compactQuery(q: AuditQuery): AuditQuery {
  return Object.fromEntries(
    Object.entries(q).filter(([, v]) => v !== undefined && v !== ''),
  ) as AuditQuery;
}
