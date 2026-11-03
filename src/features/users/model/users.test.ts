import { describe, expect, it } from 'vitest';
import type { RoleDefinition, UserAccount } from '@/shared/types/domain';
import {
  effectivePermissions,
  permissionMatrix,
  protectionFor,
  sensitiveChanges,
  toUserInput,
  validateUser,
} from './users';

const user = (id: string, over: Partial<UserAccount> = {}): UserAccount => ({
  id,
  username: id,
  displayName: id,
  email: `${id}@example.invalid`,
  emailStatus: 'verified',
  role: 'admin',
  status: 'active',
  locked: false,
  lockedUntil: null,
  failedAttempts: 0,
  mfaState: 'enrolled',
  mfaEnrolledAt: null,
  recoveryCodesRemaining: null,
  mustChangePassword: false,
  passwordSetAt: null,
  lastLoginAt: null,
  createdAt: '',
  updatedAt: '',
  synthetic: true,
  ...over,
});
const roles: RoleDefinition[] = [
  { id: 'admin', permissions: ['users.manage', 'reports.export'] },
  { id: 'viewer', permissions: ['reports.export'] },
];

describe('user administration rules', () => {
  it('requires unique usernames and emails, case-insensitively', () => {
    const users = [user('anna'), user('ben')];
    expect(
      validateUser(
        { username: 'Ben', displayName: 'x', email: 'ANNA@example.invalid', role: 'viewer' },
        users,
        null,
      ),
    ).toEqual({
      username: 'users.errors.usernameTaken',
      email: 'users.errors.emailTaken',
    });
    expect(
      validateUser({ username: '1x', displayName: '', email: 'bad', role: 'viewer' }, users, null),
    ).toEqual({
      username: 'users.errors.username',
      displayName: 'users.errors.name',
      email: 'users.errors.email',
    });
  });

  it('detects sensitive changes and protects self and the last administrator', () => {
    const a = user('anna');
    expect(sensitiveChanges(a, { ...toUserInput(a), role: 'viewer' }).role).toEqual({
      from: 'admin',
      to: 'viewer',
    });
    expect(
      sensitiveChanges(a, { ...toUserInput(a), email: ' Anna@Example.invalid ' }).email,
    ).toBeNull();
    expect(protectionFor(a, [a], 'ben')).toBe('lastAdmin');
    expect(protectionFor(a, [a, user('ben')], 'anna')).toBe('self');
    expect(protectionFor(a, [a, user('ben')], 'ben')).toBeNull();
  });

  it('builds the permission matrix and effective access', () => {
    expect(permissionMatrix(['users.manage', 'reports.export'], roles)).toEqual([
      { permission: 'users.manage', roles: { admin: true, viewer: false } },
      { permission: 'reports.export', roles: { admin: true, viewer: true } },
    ]);
    expect(effectivePermissions(user('v', { role: 'viewer' }), roles)).toMatchObject({
      canSignIn: true,
      permissions: ['reports.export'],
    });
    expect(effectivePermissions(user('l', { locked: true }), roles)).toMatchObject({
      canSignIn: false,
      permissions: [],
      blockers: ['locked'],
    });
  });
});
