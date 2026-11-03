import type {
  AccountMfa,
  AuthSession,
  MfaEnrollment,
  Permission,
  RecoveryCodesResult,
  RoleDefinition,
  SecurityPolicy,
  SecurityPolicyInput,
  UserAccount,
  UserInput,
} from '@/shared/types/domain';
import {
  arrayOf,
  bool,
  DecodeError,
  nullable,
  num,
  object,
  oneOf,
  str,
  type Decoded,
  type Decoder,
} from '../decode';
import { PERMISSIONS } from './session';

/* PROVISIONAL wire shapes for users, roles, sessions, security policy and account MFA. */

const ROLES = ['admin', 'viewer'] as const;

export const wireUser = object({
  id: str,
  username: str,
  display_name: str,
  email: str,
  email_status: oneOf(['unverified', 'verification_sent', 'verified']),
  role: oneOf(ROLES),
  status: oneOf(['active', 'disabled']),
  locked: bool,
  locked_until: nullable(str),
  failed_attempts: num,
  mfa_state: oneOf(['not_enrolled', 'pending', 'enrolled']),
  mfa_enrolled_at: nullable(str),
  recovery_codes_remaining: nullable(num),
  must_change_password: bool,
  password_set_at: nullable(str),
  last_login_at: nullable(str),
  created_at: str,
  updated_at: str,
  synthetic: bool,
});

export function userFromWire(w: Decoded<typeof wireUser>): UserAccount {
  return {
    id: w.id,
    username: w.username,
    displayName: w.display_name,
    email: w.email,
    emailStatus: w.email_status,
    role: w.role,
    status: w.status,
    locked: w.locked,
    lockedUntil: w.locked_until,
    failedAttempts: w.failed_attempts,
    mfaState: w.mfa_state,
    mfaEnrolledAt: w.mfa_enrolled_at,
    recoveryCodesRemaining: w.recovery_codes_remaining,
    mustChangePassword: w.must_change_password,
    passwordSetAt: w.password_set_at,
    lastLoginAt: w.last_login_at,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
    synthetic: w.synthetic,
  };
}

export const userInputToWire = (i: Partial<UserInput>) => {
  const out: Record<string, unknown> = {};
  if (i.username !== undefined) out.username = i.username.trim().toLowerCase();
  if (i.displayName !== undefined) out.display_name = i.displayName.trim();
  if (i.email !== undefined) out.email = i.email.trim();
  if (i.role !== undefined) out.role = i.role;
  return out;
};

/** Unknown permissions from a newer backend are dropped, like in the session decoder. */
const permissionList: Decoder<Permission[]> = (v, path = '') => {
  if (!Array.isArray(v)) throw new DecodeError(path, 'array');
  return v.filter((p): p is Permission => (PERMISSIONS as readonly unknown[]).includes(p));
};

export const wireRole = object({ id: oneOf(ROLES), permissions: permissionList });
export const roleFromWire = (w: Decoded<typeof wireRole>): RoleDefinition => ({
  id: w.id,
  permissions: w.permissions,
});

export const wireAuthSession = object({
  id: str,
  user_id: str,
  username: str,
  kind: oneOf(['demo_launch_code', 'password_mfa']),
  created_at: str,
  last_seen_at: str,
  expires_at: str,
  ip_masked: str,
  client: str,
  current: bool,
  simulated: bool,
});

export function authSessionFromWire(w: Decoded<typeof wireAuthSession>): AuthSession {
  return {
    id: w.id,
    userId: w.user_id,
    username: w.username,
    kind: w.kind,
    createdAt: w.created_at,
    lastSeenAt: w.last_seen_at,
    expiresAt: w.expires_at,
    ipMasked: w.ip_masked,
    client: w.client,
    current: w.current,
    simulated: w.simulated,
  };
}

const alwaysTrue: Decoder<true> = (v, path = '') => {
  if (v !== true) throw new DecodeError(path, 'true (MFA is mandatory)');
  return true;
};

export const wirePolicy = object({
  version: num,
  min_password_length: num,
  require_mixed_characters: bool,
  password_history: num,
  lockout_threshold: num,
  lockout_minutes: num,
  session_idle_minutes: num,
  session_max_hours: num,
  mfa_required: alwaysTrue,
  updated_at: str,
  updated_by: str,
});

export function policyFromWire(w: Decoded<typeof wirePolicy>): SecurityPolicy {
  return {
    version: w.version,
    minPasswordLength: w.min_password_length,
    requireMixedCharacters: w.require_mixed_characters,
    passwordHistory: w.password_history,
    lockoutThreshold: w.lockout_threshold,
    lockoutMinutes: w.lockout_minutes,
    sessionIdleMinutes: w.session_idle_minutes,
    sessionMaxHours: w.session_max_hours,
    mfaRequired: w.mfa_required,
    updatedAt: w.updated_at,
    updatedBy: w.updated_by,
  };
}

export const policyToWire = (i: SecurityPolicyInput) => ({
  min_password_length: i.minPasswordLength,
  require_mixed_characters: i.requireMixedCharacters,
  password_history: i.passwordHistory,
  lockout_threshold: i.lockoutThreshold,
  lockout_minutes: i.lockoutMinutes,
  session_idle_minutes: i.sessionIdleMinutes,
  session_max_hours: i.sessionMaxHours,
  mfa_required: true,
  change_note: i.changeNote.trim(),
});

export const wireAccountMfa = object({
  state: oneOf(['not_enrolled', 'pending', 'enrolled']),
  enrolled_at: nullable(str),
  recovery_codes_remaining: nullable(num),
  simulated: bool,
});

export const accountMfaFromWire = (w: Decoded<typeof wireAccountMfa>): AccountMfa => ({
  state: w.state,
  enrolledAt: w.enrolled_at,
  recoveryCodesRemaining: w.recovery_codes_remaining,
  simulated: w.simulated,
});

export const wireEnrollment = object({
  enrollment_id: str,
  issuer: str,
  account_label: str,
  secret_available: bool,
  expires_at: str,
  simulated: bool,
});

export const enrollmentFromWire = (w: Decoded<typeof wireEnrollment>): MfaEnrollment => ({
  enrollmentId: w.enrollment_id,
  issuer: w.issuer,
  accountLabel: w.account_label,
  secretAvailable: w.secret_available,
  expiresAt: w.expires_at,
  simulated: w.simulated,
});

export const wireRecoveryCodes = object({
  generated: bool,
  codes: arrayOf(str),
  simulated: bool,
  message: str,
});
export const recoveryFromWire = (w: Decoded<typeof wireRecoveryCodes>): RecoveryCodesResult => ({
  ...w,
});
