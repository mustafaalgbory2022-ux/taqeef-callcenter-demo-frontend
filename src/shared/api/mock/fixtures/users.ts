import type { Decoded } from '../../decode';
import type { wireAuthSession, wirePolicy, wireUser } from '../../wire/users';
import type { WireAdminAudit } from '../types';

export type WireUser = Decoded<typeof wireUser>;
export type WireAuthSession = Decoded<typeof wireAuthSession>;
export type WirePolicy = Decoded<typeof wirePolicy>;

/** The demo session's synthetic administrator (the actor of every simulated change). */
export const CURRENT_USER_ID = 'usr-admin';

const AT = '2026-09-15T09:00:00+03:00';

const user = (
  id: string,
  username: string,
  name: string,
  role: WireUser['role'],
  over: Partial<WireUser> = {},
): WireUser => ({
  id,
  username,
  display_name: name,
  email: `${username}@example.invalid`,
  email_status: 'verified',
  role,
  status: 'active',
  locked: false,
  locked_until: null,
  failed_attempts: 0,
  mfa_state: 'enrolled',
  mfa_enrolled_at: AT,
  recovery_codes_remaining: 8,
  must_change_password: false,
  password_set_at: AT,
  last_login_at: '2026-11-01T08:10:00+03:00',
  created_at: AT,
  updated_at: AT,
  synthetic: true,
  ...over,
});

/** SYNTHETIC accounts. Addresses use the reserved .invalid domain; no password exists. */
export function seedUsers(now: number): WireUser[] {
  return [
    user(CURRENT_USER_ID, 'demo.admin', 'Synthetic administrator', 'admin', {
      mfa_state: 'not_enrolled',
      mfa_enrolled_at: null,
      recovery_codes_remaining: null,
      last_login_at: null,
    }),
    user('usr-supervisor', 'quality.lead', 'Synthetic supervisor', 'admin'),
    user('usr-viewer', 'report.viewer', 'Report viewer (synthetic)', 'viewer', {
      recovery_codes_remaining: 10,
    }),
    user('usr-ops', 'ops.viewer', 'Operations viewer (synthetic)', 'viewer', {
      email_status: 'verification_sent',
      mfa_state: 'pending',
      mfa_enrolled_at: null,
      recovery_codes_remaining: null,
      locked: true,
      locked_until: new Date(now + 15 * 60_000).toISOString(),
      failed_attempts: 5,
      last_login_at: null,
    }),
    user('usr-former', 'former.viewer', 'Former viewer (synthetic)', 'viewer', {
      status: 'disabled',
    }),
  ];
}

export function seedSessions(now: number): WireAuthSession[] {
  const iso = (min: number) => new Date(now + min * 60_000).toISOString();
  return [
    {
      id: 'sess-demo',
      user_id: CURRENT_USER_ID,
      username: 'demo.admin',
      kind: 'demo_launch_code',
      created_at: iso(-5),
      last_seen_at: iso(0),
      expires_at: iso(8 * 60),
      ip_masked: '127.0.0.•',
      client: 'This browser (demo launch code)',
      current: true,
      simulated: true,
    },
    {
      id: 'sess-sup',
      user_id: 'usr-supervisor',
      username: 'quality.lead',
      kind: 'password_mfa',
      created_at: iso(-120),
      last_seen_at: iso(-3),
      expires_at: iso(6 * 60),
      ip_masked: '10.20.•.•',
      client: 'Synthetic desktop browser',
      current: false,
      simulated: true,
    },
    {
      id: 'sess-viewer',
      user_id: 'usr-viewer',
      username: 'report.viewer',
      kind: 'password_mfa',
      created_at: iso(-300),
      last_seen_at: iso(-45),
      expires_at: iso(3 * 60),
      ip_masked: '10.20.•.•',
      client: 'Synthetic laptop browser',
      current: false,
      simulated: true,
    },
  ];
}

export const initialPolicy: WirePolicy = {
  version: 1,
  min_password_length: 12,
  require_mixed_characters: true,
  password_history: 5,
  lockout_threshold: 5,
  lockout_minutes: 15,
  session_idle_minutes: 30,
  session_max_hours: 10,
  mfa_required: true,
  updated_at: AT,
  updated_by: 'Synthetic administrator',
};

/** Synthetic security events (masked addresses; never passwords or one-time codes). */
export function seedSecurityEvents(now: number): WireAdminAudit[] {
  const iso = (min: number) => new Date(now + min * 60_000).toISOString();
  const event = (
    i: number,
    action: WireAdminAudit['action'],
    result: WireAdminAudit['result'],
    summary: string,
    min: number,
    id = 'usr-ops',
    actor = 'ops.viewer',
  ): WireAdminAudit => ({
    id: `adm-sec-${i}`,
    resource: 'auth',
    resource_id: id,
    action,
    actor,
    at: iso(min),
    summary,
    changes: [],
    result,
    correlation_id: `cid-sec-${String(i).padStart(4, '0')}`,
    simulated: true,
  });
  return [
    event(7, 'locked_out', 'failure', 'Account locked after 5 failed sign-ins from 10.20.•.•', -10),
    ...[6, 5, 4, 3, 2].map((i) =>
      event(i, 'login_failed', 'failure', 'Wrong password from 10.20.•.•', -10 - i),
    ),
    event(
      1,
      'login_succeeded',
      'success',
      'Password and authenticator code accepted from 10.20.•.•',
      -120,
      'usr-supervisor',
      'quality.lead',
    ),
  ];
}
