import type { AdminResource } from '@/shared/types/domain';
import { useApiQuery } from './useApiQuery';

/**
 * Audit history for an administration resource. Keyed under the resource's own invalidation
 * prefix so a mutation that invalidates e.g. 'pbx' also refreshes its history view.
 */
export function useAdminAudit(prefix: string, resource: AdminResource, resourceId?: string | null) {
  return useApiQuery(
    [prefix, 'audit', resource, resourceId ?? null],
    (api) => api.audit.list({ resource, resourceId: resourceId ?? undefined }),
    { enabled: resourceId !== null },
  );
}
