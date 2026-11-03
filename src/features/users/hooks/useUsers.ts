import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import type { UserAccount, UserInput } from '@/shared/types/domain';

/** User changes also affect sessions and security views. */
const AFFECTED = ['users', 'security'] as const;

export const useUsers = () => useApiQuery(['users', 'list'], (api) => api.users.list());
export const useRoles = () => useApiQuery(['users', 'roles'], (api) => api.users.roles());

export const useSaveUser = () =>
  useApiMutation(
    (api, a: { id: string | null; input: UserInput; confirm: boolean }) =>
      a.id ? api.users.update(a.id, a.input, a.confirm) : api.users.create(a.input),
    AFFECTED,
  );

export type UserAction =
  | { kind: 'status'; user: UserAccount; status: UserAccount['status'] }
  | { kind: 'passwordReset'; user: UserAccount }
  | { kind: 'mfaReset'; user: UserAccount; reason: string }
  | { kind: 'unlock'; user: UserAccount }
  | { kind: 'verification'; user: UserAccount };

export const useUserAction = () =>
  useApiMutation((api, a: UserAction) => {
    switch (a.kind) {
      case 'status':
        return api.users.setStatus(a.user.id, a.status);
      case 'passwordReset':
        return api.users.resetPassword(a.user.id);
      case 'mfaReset':
        return api.users.resetMfa(a.user.id, a.reason);
      case 'unlock':
        return api.users.unlock(a.user.id);
      case 'verification':
        return api.users.sendVerification(a.user.id);
    }
  }, AFFECTED);
