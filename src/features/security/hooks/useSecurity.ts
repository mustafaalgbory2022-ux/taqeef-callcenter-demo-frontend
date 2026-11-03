import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import type { SecurityPolicyInput } from '@/shared/types/domain';

const AFFECTED = ['security', 'users'] as const;

export const useSessions = () =>
  useApiQuery(['security', 'sessions'], (api) => api.auth.sessions());
export const usePolicy = () => useApiQuery(['security', 'policy'], (api) => api.auth.policy());
export const useMyMfa = () => useApiQuery(['security', 'myMfa'], (api) => api.auth.myMfa());
export const useSecurityEvents = () =>
  useApiQuery(['security', 'events'], (api) => api.audit.list({ resource: 'auth' }));

export const useRevokeSession = () =>
  useApiMutation((api, id: string) => api.auth.revokeSession(id), AFFECTED);
export const useSavePolicy = () =>
  useApiMutation((api, i: SecurityPolicyInput) => api.auth.savePolicy(i), AFFECTED);
export const useStartEnrollment = () =>
  useApiMutation((api) => api.auth.startEnrollment(), AFFECTED);
export const useVerifyEnrollment = () =>
  useApiMutation(
    (api, a: { id: string; code: string }) => api.auth.verifyEnrollment(a.id, a.code),
    AFFECTED,
  );
export const useRecoveryCodes = () =>
  useApiMutation((api) => api.auth.regenerateRecoveryCodes(), AFFECTED);
export const useChangePassword = () =>
  useApiMutation(
    (api, a: { current: string; next: string }) => api.auth.changePassword(a.current, a.next),
    AFFECTED,
  );
