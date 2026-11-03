import type { AdminAuditEntry, AuditExport, AuditQuery } from '@/shared/types/domain';
import { endpoints } from '../endpoints';
import { listOf, type Send } from '../send';
import { adminAuditFromWire, wireAdminAudit, wireAuditExport } from '../wire/admin';

const toQuery = (f: AuditQuery) => ({
  resource: f.resource,
  resource_id: f.resourceId,
  action: f.action,
  result: f.result,
  actor: f.actor?.trim() || undefined,
  search: f.search?.trim() || undefined,
  from: f.from,
  to: f.to,
});

/**
 * Read-only access to the append-only administration and security audit log (GUI-X4).
 * There is no update or delete operation. Exports are themselves audited by the server.
 */
export interface AuditApi {
  list(filter?: AuditQuery): Promise<AdminAuditEntry[]>;
  export(filter: AuditQuery): Promise<AuditExport>;
}

export function createAuditApi(send: Send): AuditApi {
  const entries = listOf(wireAdminAudit, adminAuditFromWire);
  return {
    list: (filter = {}) =>
      send(
        { method: 'GET', path: endpoints.adminAudit, query: toQuery(filter) },
        entries.decoder,
        entries.map,
      ),
    export: (filter) =>
      send(
        { method: 'POST', path: endpoints.adminAuditExport, body: toQuery(filter) },
        wireAuditExport,
        (w) => ({
          exportedAt: w.exported_at,
          count: w.count,
          entries: w.entries.map(adminAuditFromWire),
          simulated: w.simulated,
        }),
      ),
  };
}
