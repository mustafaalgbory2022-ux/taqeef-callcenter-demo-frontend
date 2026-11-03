import type {
  AccountMfa,
  AuthSession,
  MfaEnrollment,
  RecoveryCodesResult,
  RoleDefinition,
  SecurityPolicy,
  SecurityPolicyInput,
  UserAccount,
  UserInput,
} from '@/shared/types/domain';
import { object, str } from '../decode';
import { endpoints } from '../endpoints';
import { listOf, type Send } from '../send';
import {
  accountMfaFromWire,
  authSessionFromWire,
  enrollmentFromWire,
  policyFromWire,
  policyToWire,
  recoveryFromWire,
  roleFromWire,
  userFromWire,
  userInputToWire,
  wireAccountMfa,
  wireAuthSession,
  wireEnrollment,
  wirePolicy,
  wireRecoveryCodes,
  wireRole,
  wireUser,
} from '../wire/users';

/**
 * User administration (PROVISIONAL routes). Sensitive changes carry `confirm: true`; the
 * server rejects them otherwise (409) and enforces last-admin and self-change protections.
 */
export interface UsersApi {
  list(): Promise<UserAccount[]>;
  roles(): Promise<RoleDefinition[]>;
  create(input: UserInput): Promise<UserAccount>;
  update(id: string, patch: Partial<UserInput>, confirm: boolean): Promise<UserAccount>;
  setStatus(id: string, status: UserAccount['status']): Promise<UserAccount>;
  resetPassword(id: string): Promise<UserAccount>;
  resetMfa(id: string, reason: string): Promise<UserAccount>;
  unlock(id: string): Promise<UserAccount>;
  sendVerification(id: string): Promise<UserAccount>;
}

/**
 * Production authentication administration and the signed-in user's own security
 * (PROVISIONAL). Passwords, TOTP secrets and recovery codes exist only on the backend.
 */
export interface AuthApi {
  sessions(): Promise<AuthSession[]>;
  revokeSession(id: string): Promise<AuthSession[]>;
  policy(): Promise<SecurityPolicy>;
  savePolicy(input: SecurityPolicyInput): Promise<SecurityPolicy>;
  myMfa(): Promise<AccountMfa>;
  startEnrollment(): Promise<MfaEnrollment>;
  verifyEnrollment(enrollmentId: string, code: string): Promise<AccountMfa>;
  regenerateRecoveryCodes(): Promise<RecoveryCodesResult>;
  changePassword(current: string, next: string): Promise<{ message: string }>;
}

export function createUsersApi(send: Send): UsersApi {
  const users = listOf(wireUser, userFromWire);
  const roles = listOf(wireRole, roleFromWire);
  const one = (method: 'POST' | 'PUT' | 'PATCH', path: string, body?: unknown) =>
    send({ method, path, body }, wireUser, userFromWire);
  return {
    list: () => send({ method: 'GET', path: endpoints.users }, users.decoder, users.map),
    roles: () => send({ method: 'GET', path: endpoints.roles }, roles.decoder, roles.map),
    create: (input) => one('POST', endpoints.users, userInputToWire(input)),
    update: (id, patch, confirm) =>
      one('PATCH', endpoints.user(id), { ...userInputToWire(patch), confirm }),
    setStatus: (id, status) => one('PUT', endpoints.userStatus(id), { status, confirm: true }),
    resetPassword: (id) => one('POST', endpoints.userPasswordReset(id), { confirm: true }),
    resetMfa: (id, reason) =>
      one('POST', endpoints.userMfaReset(id), { reason: reason.trim(), confirm: true }),
    unlock: (id) => one('POST', endpoints.userUnlock(id)),
    sendVerification: (id) => one('POST', endpoints.userVerification(id)),
  };
}

export function createAuthApi(send: Send): AuthApi {
  const sessions = listOf(wireAuthSession, authSessionFromWire);
  return {
    sessions: () =>
      send({ method: 'GET', path: endpoints.authSessions }, sessions.decoder, sessions.map),
    revokeSession: (id) =>
      send(
        { method: 'POST', path: endpoints.authSessionRevoke(id), body: { confirm: true } },
        sessions.decoder,
        sessions.map,
      ),
    policy: () => send({ method: 'GET', path: endpoints.authPolicy }, wirePolicy, policyFromWire),
    savePolicy: (input) =>
      send(
        { method: 'PUT', path: endpoints.authPolicy, body: policyToWire(input) },
        wirePolicy,
        policyFromWire,
      ),
    myMfa: () =>
      send({ method: 'GET', path: endpoints.accountMfa }, wireAccountMfa, accountMfaFromWire),
    startEnrollment: () =>
      send(
        { method: 'POST', path: endpoints.accountMfaEnrollment },
        wireEnrollment,
        enrollmentFromWire,
      ),
    verifyEnrollment: (enrollmentId, code) =>
      send(
        {
          method: 'POST',
          path: endpoints.accountMfaVerify,
          body: { enrollment_id: enrollmentId, code: code.trim() },
        },
        wireAccountMfa,
        accountMfaFromWire,
      ),
    regenerateRecoveryCodes: () =>
      send(
        { method: 'POST', path: endpoints.accountRecoveryCodes, body: { confirm: true } },
        wireRecoveryCodes,
        recoveryFromWire,
      ),
    changePassword: (current, next) =>
      send(
        {
          method: 'POST',
          path: endpoints.accountPassword,
          body: { current_password: current, new_password: next },
        },
        object({ message: str }),
        (w) => ({ message: w.message }),
      ),
  };
}
