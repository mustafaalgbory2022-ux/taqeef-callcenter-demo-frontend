import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import type { AuditQuery } from '@/shared/types/domain';

export const useAuditLog = (q: AuditQuery, enabled: boolean) =>
  useApiQuery(['audit', q], (api) => api.audit.list(q), { enabled });

/** Invalidates every audit view, because the export is recorded in the log. */
export const useAuditExport = () =>
  useApiMutation((api, q: AuditQuery) => api.audit.export(q), ['audit', 'users', 'security']);
