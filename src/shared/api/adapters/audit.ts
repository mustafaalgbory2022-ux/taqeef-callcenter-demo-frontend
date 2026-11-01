import type { AdminAuditEntry, AdminResource } from '@/shared/types/domain';
import { endpoints } from '../endpoints';
import { listOf, type Send } from '../send';
import { adminAuditFromWire, wireAdminAudit } from '../wire/admin';

export interface AuditFilter {
  resource?: AdminResource | undefined;
  resourceId?: string | undefined;
}

/** Read-only access to the append-only administration audit log (GUI-X4). */
export interface AuditApi {
  list(filter?: AuditFilter): Promise<AdminAuditEntry[]>;
}

export function createAuditApi(send: Send): AuditApi {
  const entries = listOf(wireAdminAudit, adminAuditFromWire);
  return {
    list: (filter = {}) =>
      send(
        {
          method: 'GET',
          path: endpoints.adminAudit,
          query: { resource: filter.resource, resource_id: filter.resourceId },
        },
        entries.decoder,
        entries.map,
      ),
  };
}
