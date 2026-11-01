import type { Permission } from '@/shared/types/domain';
import { useSession } from './useSession';

/** UI-side permission check. The server remains the authority. */
export function usePermission(permission: Permission): boolean {
  return useSession().permissions.includes(permission);
}
