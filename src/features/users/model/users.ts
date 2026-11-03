import type { MessageKey } from '@/shared/i18n/translate';
import type {
  Permission,
  RoleDefinition,
  UserAccount,
  UserInput,
  UserRole,
} from '@/shared/types/domain';
import { isEmail } from '@/shared/utils/emailRules';
import { USERNAME_PATTERN } from '@/shared/utils/securityRules';

export type UserField = keyof UserInput;

export const emptyUserInput: UserInput = {
  username: '',
  displayName: '',
  email: '',
  role: 'viewer',
};

export const toUserInput = (u: UserAccount): UserInput => ({
  username: u.username,
  displayName: u.displayName,
  email: u.email,
  role: u.role,
});

/** Client-side checks mirroring the server (unique username and email, case-insensitive). */
export function validateUser(
  i: UserInput,
  users: readonly UserAccount[],
  selfId: string | null,
): Partial<Record<UserField, MessageKey>> {
  const e: Partial<Record<UserField, MessageKey>> = {};
  const username = i.username.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username)) e.username = 'users.errors.username';
  else if (users.some((u) => u.id !== selfId && u.username === username))
    e.username = 'users.errors.usernameTaken';
  if (!i.displayName.trim() || i.displayName.trim().length > 80)
    e.displayName = 'users.errors.name';
  const email = i.email.trim().toLowerCase();
  if (!isEmail(email)) e.email = 'users.errors.email';
  else if (users.some((u) => u.id !== selfId && u.email.toLowerCase() === email))
    e.email = 'users.errors.emailTaken';
  return e;
}

export const USER_SERVER_FIELD: Record<string, UserField> = {
  username: 'username',
  display_name: 'displayName',
  email: 'email',
  role: 'role',
};

export interface SensitiveChanges {
  role: { from: UserRole; to: UserRole } | null;
  email: { from: string; to: string } | null;
}

/** Role and email changes affect access and sign-in, so they need explicit confirmation. */
export function sensitiveChanges(u: UserAccount | null, i: UserInput): SensitiveChanges {
  if (!u) return { role: null, email: null };
  return {
    role: u.role !== i.role ? { from: u.role, to: i.role } : null,
    email:
      u.email.toLowerCase() !== i.email.trim().toLowerCase()
        ? { from: u.email, to: i.email.trim() }
        : null,
  };
}

export type ProtectedReason = 'self' | 'lastAdmin' | null;

/** Why disabling or demoting this account is not allowed (also enforced by the server). */
export function protectionFor(
  u: UserAccount,
  users: readonly UserAccount[],
  currentUserId: string | null,
): ProtectedReason {
  if (u.id === currentUserId) return 'self';
  const otherAdmins = users.filter(
    (x) => x.id !== u.id && x.role === 'admin' && x.status === 'active',
  ).length;
  if (u.role === 'admin' && otherAdmins === 0) return 'lastAdmin';
  return null;
}

export interface MatrixRow {
  permission: Permission;
  roles: Record<UserRole, boolean>;
}

/** Permission × role matrix from the backend's role definitions. */
export function permissionMatrix(
  all: readonly Permission[],
  roles: readonly RoleDefinition[],
): MatrixRow[] {
  return all.map((permission) => ({
    permission,
    roles: {
      admin: roles.find((r) => r.id === 'admin')?.permissions.includes(permission) ?? false,
      viewer: roles.find((r) => r.id === 'viewer')?.permissions.includes(permission) ?? false,
    },
  }));
}

/** What a user can actually do now: nothing while disabled or locked; the role otherwise. */
export function effectivePermissions(
  u: UserAccount,
  roles: readonly RoleDefinition[],
): {
  canSignIn: boolean;
  blockers: ('disabled' | 'locked' | 'emailUnverified' | 'mfaNotEnrolled')[];
  permissions: readonly Permission[];
} {
  const blockers: ('disabled' | 'locked' | 'emailUnverified' | 'mfaNotEnrolled')[] = [];
  if (u.status === 'disabled') blockers.push('disabled');
  if (u.locked) blockers.push('locked');
  if (u.emailStatus !== 'verified') blockers.push('emailUnverified');
  // Enrollment happens during the first sign-in, so it does not block access by itself.
  if (u.mfaState !== 'enrolled') blockers.push('mfaNotEnrolled');
  const hard = blockers.some((b) => b === 'disabled' || b === 'locked' || b === 'emailUnverified');
  return {
    canSignIn: !hard,
    blockers,
    permissions: hard ? [] : (roles.find((r) => r.id === u.role)?.permissions ?? []),
  };
}
