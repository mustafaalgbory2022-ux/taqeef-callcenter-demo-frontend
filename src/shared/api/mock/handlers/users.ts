import { isEmail } from '@/shared/utils/emailRules';
import {
  MFA_RESET_REASON_MIN,
  passwordIssues,
  POLICY_RANGES,
  TOTP_PATTERN,
  USERNAME_PATTERN,
  VIEWER_PERMISSIONS,
} from '@/shared/utils/securityRules';
import { recordAudit } from '../audit';
import { nextId } from '../db';
import { CURRENT_USER_ID, type WireUser } from '../fixtures/users';
import { created, fail, invalid, ok, type Route } from '../router';
import type { MockState } from '../types';

const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function userRoutes(
  state: MockState,
  allPermissions: readonly string[],
  persist: () => void,
): Route[] {
  const u = state.security;
  const find = (id: string | undefined) => u.users.find((x) => x.id === id);
  const activeAdmins = (exceptId: string) =>
    u.users.filter((x) => x.id !== exceptId && x.role === 'admin' && x.status === 'active').length;
  const revokeSessionsOf = (userId: string) => {
    u.sessions = u.sessions.filter((x) => x.user_id !== userId || x.current);
  };
  const touch = (x: WireUser) => {
    x.updated_at = new Date().toISOString();
  };
  const audit = (
    x: WireUser,
    action: Parameters<typeof recordAudit>[1]['action'],
    summary: string,
    changes: { field: string; before: string | null; after: string | null }[] = [],
    result: 'success' | 'denied' | 'failure' = 'success',
  ) =>
    recordAudit(state, {
      resource: 'user',
      resourceId: x.id,
      action,
      summary: `${x.username}: ${summary}`,
      changes,
      result,
    });
  /** Denied sensitive actions are audited too. */
  const deny = (
    x: WireUser,
    action: Parameters<typeof recordAudit>[1]['action'],
    status: number,
    message: string,
  ) => {
    audit(x, action, `denied — ${message}`, [], 'denied');
    persist();
    return fail(status, message);
  };

  function validate(b: Record<string, unknown>, selfId: string | null, isCreate: boolean) {
    if (isCreate || b.username !== undefined) {
      const name = s(b.username).toLowerCase();
      if (!USERNAME_PATTERN.test(name))
        return invalid(
          'username',
          'Use 3–32 lowercase letters, digits, dots, hyphens or underscores, starting with a letter.',
        );
      if (u.users.some((x) => x.id !== selfId && x.username === name))
        return invalid('username', 'This username is already taken.');
    }
    if (isCreate || b.display_name !== undefined) {
      if (!s(b.display_name) || s(b.display_name).length > 80)
        return invalid('display_name', 'Enter a name of up to 80 characters.');
    }
    if (isCreate || b.email !== undefined) {
      const email = s(b.email);
      if (!isEmail(email)) return invalid('email', 'Enter a valid email address.');
      if (u.users.some((x) => x.id !== selfId && x.email.toLowerCase() === email.toLowerCase()))
        return invalid('email', 'Another account already uses this email address.');
    }
    if (isCreate || b.role !== undefined) {
      if (b.role === 'agent')
        return invalid('role', 'Agents do not receive accounts (no agent self-service).');
      if (b.role !== 'admin' && b.role !== 'viewer')
        return invalid('role', 'Choose Administrator or Read-only.');
    }
    return null;
  }

  return [
    {
      method: 'GET',
      pattern: '/users',
      handler: () => ok([...u.users].sort((a, b) => a.display_name.localeCompare(b.display_name))),
    },
    {
      method: 'GET',
      pattern: '/auth/roles',
      handler: () =>
        ok([
          { id: 'admin', permissions: allPermissions },
          { id: 'viewer', permissions: VIEWER_PERMISSIONS },
        ]),
    },
    {
      method: 'POST',
      pattern: '/users',
      handler: ({ body }) => {
        const b = (body ?? {}) as Record<string, unknown>;
        const error = validate(b, null, true);
        if (error) return error;
        const now = new Date().toISOString();
        const x: WireUser = {
          id: nextId(state, 'usr'),
          username: s(b.username).toLowerCase(),
          display_name: s(b.display_name),
          email: s(b.email),
          // A new account must verify its email and enroll MFA before first sign-in.
          email_status: 'verification_sent',
          role: b.role as WireUser['role'],
          status: 'active',
          locked: false,
          locked_until: null,
          failed_attempts: 0,
          mfa_state: 'not_enrolled',
          mfa_enrolled_at: null,
          recovery_codes_remaining: null,
          must_change_password: true,
          password_set_at: null,
          last_login_at: null,
          created_at: now,
          updated_at: now,
          synthetic: true,
        };
        u.users.push(x);
        audit(x, 'created', `account created (${x.role}); verification email simulated`, [
          { field: 'role', before: null, after: x.role },
          { field: 'email', before: null, after: x.email },
        ]);
        persist();
        return created(x);
      },
    },
    {
      method: 'PATCH',
      pattern: '/users/:id',
      handler: ({ params, body }) => {
        const x = find(params.id);
        if (!x) return fail(404, 'User not found.');
        const b = (body ?? {}) as Record<string, unknown>;
        const error = validate(b, x.id, false);
        if (error) return error;
        const roleChange = b.role !== undefined && b.role !== x.role;
        const emailChange =
          b.email !== undefined && s(b.email).toLowerCase() !== x.email.toLowerCase();
        if (roleChange && x.id === CURRENT_USER_ID)
          return deny(x, 'role_changed', 409, 'You cannot change your own role.');
        if (roleChange && x.role === 'admin' && activeAdmins(x.id) === 0)
          return deny(x, 'role_changed', 409, 'At least one active administrator must remain.');
        if ((roleChange || emailChange) && b.confirm !== true)
          return fail(409, 'Role and email changes must be confirmed.');
        const changes: { field: string; before: string | null; after: string | null }[] = [];
        if (b.display_name !== undefined && s(b.display_name) !== x.display_name) {
          changes.push({ field: 'display_name', before: x.display_name, after: s(b.display_name) });
          x.display_name = s(b.display_name);
        }
        if (b.username !== undefined && s(b.username).toLowerCase() !== x.username) {
          changes.push({
            field: 'username',
            before: x.username,
            after: s(b.username).toLowerCase(),
          });
          x.username = s(b.username).toLowerCase();
        }
        if (emailChange) {
          changes.push({ field: 'email', before: x.email, after: s(b.email) });
          x.email = s(b.email);
          x.email_status = 'verification_sent';
        }
        if (roleChange) {
          changes.push({ field: 'role', before: x.role, after: String(b.role) });
          x.role = b.role as WireUser['role'];
          revokeSessionsOf(x.id); // new permissions take effect at next sign-in
        }
        if (changes.length === 0) return ok(x);
        touch(x);
        audit(
          x,
          roleChange ? 'role_changed' : 'updated',
          roleChange ? `role changed to ${x.role}; sessions revoked` : 'account updated',
          changes,
        );
        persist();
        return ok(x);
      },
    },
    {
      method: 'PUT',
      pattern: '/users/:id/status',
      handler: ({ params, body }) => {
        const x = find(params.id);
        if (!x) return fail(404, 'User not found.');
        const b = (body ?? {}) as Record<string, unknown>;
        if (b.status !== 'active' && b.status !== 'disabled')
          return invalid('status', 'Invalid status.');
        if (b.confirm !== true) return fail(409, 'Account status changes must be confirmed.');
        if (b.status === x.status) return ok(x);
        if (b.status === 'disabled') {
          if (x.id === CURRENT_USER_ID)
            return deny(x, 'disabled', 409, 'You cannot disable your own account.');
          if (x.role === 'admin' && activeAdmins(x.id) === 0)
            return deny(x, 'disabled', 409, 'At least one active administrator must remain.');
          revokeSessionsOf(x.id);
        }
        x.status = b.status;
        touch(x);
        audit(
          x,
          x.status === 'disabled' ? 'disabled' : 'enabled',
          x.status === 'disabled' ? 'account disabled; sessions revoked' : 'account enabled',
          [
            {
              field: 'status',
              before: x.status === 'disabled' ? 'active' : 'disabled',
              after: x.status,
            },
          ],
        );
        persist();
        return ok(x);
      },
    },
    {
      method: 'POST',
      pattern: '/users/:id/password-reset',
      handler: ({ params, body }) => {
        const x = find(params.id);
        if (!x) return fail(404, 'User not found.');
        if ((body as { confirm?: unknown } | null)?.confirm !== true)
          return fail(409, 'Password resets must be confirmed.');
        if (x.status !== 'active')
          return fail(409, 'Enable the account before resetting its password.');
        if (x.email_status !== 'verified')
          return fail(409, 'The email address must be verified before a reset link can be sent.');
        x.must_change_password = true;
        revokeSessionsOf(x.id);
        touch(x);
        audit(
          x,
          'password_reset',
          'password reset; reset link simulated (nothing sent); sessions revoked',
        );
        persist();
        return ok(x);
      },
    },
    {
      method: 'POST',
      pattern: '/users/:id/mfa-reset',
      handler: ({ params, body }) => {
        const x = find(params.id);
        if (!x) return fail(404, 'User not found.');
        const b = (body ?? {}) as Record<string, unknown>;
        if (b.confirm !== true) return fail(409, 'MFA resets must be confirmed.');
        // Recovery for a lost authenticator needs a second administrator.
        if (x.id === CURRENT_USER_ID)
          return deny(x, 'mfa_reset', 403, 'Another administrator must reset your MFA.');
        if (s(b.reason).length < MFA_RESET_REASON_MIN)
          return invalid('reason', `Give a reason of at least ${MFA_RESET_REASON_MIN} characters.`);
        const before = x.mfa_state;
        x.mfa_state = 'not_enrolled';
        x.mfa_enrolled_at = null;
        x.recovery_codes_remaining = null;
        revokeSessionsOf(x.id);
        touch(x);
        audit(x, 'mfa_reset', `MFA reset — ${s(b.reason)}; must re-enroll at next sign-in`, [
          { field: 'mfa_state', before, after: 'not_enrolled' },
        ]);
        persist();
        return ok(x);
      },
    },
    {
      method: 'POST',
      pattern: '/users/:id/unlock',
      handler: ({ params }) => {
        const x = find(params.id);
        if (!x) return fail(404, 'User not found.');
        if (!x.locked) return ok(x);
        x.locked = false;
        x.locked_until = null;
        x.failed_attempts = 0;
        touch(x);
        audit(x, 'unlocked', 'account unlocked');
        persist();
        return ok(x);
      },
    },
    {
      method: 'POST',
      pattern: '/users/:id/email-verification',
      handler: ({ params }) => {
        const x = find(params.id);
        if (!x) return fail(404, 'User not found.');
        if (x.email_status === 'verified')
          return fail(409, 'This email address is already verified.');
        x.email_status = 'verification_sent';
        touch(x);
        audit(x, 'verification_sent', `verification email simulated to ${x.email} (nothing sent)`);
        persist();
        return ok(x);
      },
    },
    { method: 'GET', pattern: '/auth/sessions', handler: () => ok(u.sessions) },
    {
      method: 'POST',
      pattern: '/auth/sessions/:id/revoke',
      handler: ({ params }) => {
        const sess = u.sessions.find((x) => x.id === params.id);
        if (!sess) return fail(404, 'Session not found.');
        if (sess.current) return fail(409, 'This is your current session. Sign out instead.');
        u.sessions = u.sessions.filter((x) => x.id !== sess.id);
        recordAudit(state, {
          resource: 'session',
          resourceId: sess.id,
          action: 'revoked',
          summary: `Session of ${sess.username} revoked (${sess.ip_masked})`,
        });
        persist();
        return ok(u.sessions);
      },
    },
    { method: 'GET', pattern: '/auth/policy', handler: () => ok(u.policy) },
    {
      method: 'PUT',
      pattern: '/auth/policy',
      handler: ({ body }) => {
        const b = (body ?? {}) as Record<string, unknown>;
        if (b.mfa_required !== true)
          return invalid('mfa_required', 'MFA is mandatory and cannot be switched off.');
        const map = {
          minPasswordLength: 'min_password_length',
          passwordHistory: 'password_history',
          lockoutThreshold: 'lockout_threshold',
          lockoutMinutes: 'lockout_minutes',
          sessionIdleMinutes: 'session_idle_minutes',
          sessionMaxHours: 'session_max_hours',
        } as const;
        for (const [k, wire] of Object.entries(map) as [
          keyof typeof map,
          (typeof map)[keyof typeof map],
        ][]) {
          const v = b[wire];
          const [min, max] = POLICY_RANGES[k];
          if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max)
            return invalid(wire, `Enter a whole number from ${min} to ${max}.`);
        }
        if (typeof b.require_mixed_characters !== 'boolean')
          return invalid('require_mixed_characters', 'Invalid value.');
        if ((b.session_idle_minutes as number) > (b.session_max_hours as number) * 60)
          return invalid(
            'session_idle_minutes',
            'The idle timeout cannot exceed the maximum session length.',
          );
        if (s(b.change_note).length < 3) return invalid('change_note', 'Describe the change.');
        const before = { ...u.policy };
        const next = {
          ...before,
          ...Object.fromEntries(Object.values(map).map((w) => [w, b[w]])),
          require_mixed_characters: b.require_mixed_characters as boolean,
          version: before.version + 1,
          updated_at: new Date().toISOString(),
          updated_by: 'Synthetic administrator',
        };
        const keys = [...Object.values(map), 'require_mixed_characters'] as const;
        const changes = keys.flatMap((k) =>
          String(before[k]) === String(next[k])
            ? []
            : [{ field: k, before: String(before[k]), after: String(next[k]) }],
        );
        if (changes.length === 0) return fail(409, 'No changes compared with the current version.');
        u.policy = next;
        recordAudit(state, {
          resource: 'security_policy',
          resourceId: `v${next.version}`,
          action: 'version_saved',
          summary: `Security policy v${next.version}: ${s(b.change_note)}`,
          changes,
        });
        persist();
        return ok(next);
      },
    },
    {
      method: 'GET',
      pattern: '/account/mfa',
      handler: () => {
        const me = find(CURRENT_USER_ID);
        return ok({
          state: me?.mfa_state ?? 'not_enrolled',
          enrolled_at: me?.mfa_enrolled_at ?? null,
          recovery_codes_remaining: me?.recovery_codes_remaining ?? null,
          simulated: true,
        });
      },
    },
    {
      method: 'POST',
      pattern: '/account/mfa/enrollment',
      handler: () => {
        const me = find(CURRENT_USER_ID);
        if (!me) return fail(404, 'User not found.');
        if (me.mfa_state === 'enrolled')
          return fail(409, 'MFA is already enrolled. Ask another administrator to reset it first.');
        const enrollment = {
          id: nextId(state, 'enr'),
          expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
        };
        u.enrollment = enrollment;
        me.mfa_state = 'pending';
        persist();
        return created({
          enrollment_id: enrollment.id,
          issuer: 'Call Center AI',
          account_label: me.username,
          // The simulation has no TOTP secret: no QR code or key is ever produced in the browser.
          secret_available: false,
          expires_at: enrollment.expires_at,
          simulated: true,
        });
      },
    },
    {
      method: 'POST',
      pattern: '/account/mfa/enrollment/verify',
      handler: ({ body }) => {
        const me = find(CURRENT_USER_ID);
        const b = (body ?? {}) as Record<string, unknown>;
        if (!me || !u.enrollment || b.enrollment_id !== u.enrollment.id)
          return fail(409, 'Start enrollment again.');
        if (Date.parse(u.enrollment.expires_at) < Date.now())
          return fail(409, 'The enrollment expired. Start again.');
        if (!TOTP_PATTERN.test(s(b.code)))
          return invalid('code', 'Enter the 6-digit code from the authenticator app.');
        // SIMULATED: only the format is checked; there is no secret to verify against.
        me.mfa_state = 'enrolled';
        me.mfa_enrolled_at = new Date().toISOString();
        me.recovery_codes_remaining = null;
        u.enrollment = null;
        touch(me);
        recordAudit(state, {
          resource: 'user',
          resourceId: me.id,
          action: 'mfa_enrolled',
          summary: `${me.username}: MFA enrollment completed (simulated verification; code not recorded)`,
        });
        persist();
        return ok({
          state: me.mfa_state,
          enrolled_at: me.mfa_enrolled_at,
          recovery_codes_remaining: null,
          simulated: true,
        });
      },
    },
    {
      method: 'POST',
      pattern: '/account/mfa/recovery-codes',
      handler: () => {
        const me = find(CURRENT_USER_ID);
        if (!me || me.mfa_state !== 'enrolled')
          return fail(409, 'Enroll MFA before generating recovery codes.');
        recordAudit(state, {
          resource: 'user',
          resourceId: me.id,
          action: 'generated',
          summary: `${me.username}: recovery code generation requested (simulated — none generated)`,
        });
        persist();
        return ok({
          generated: false,
          codes: [],
          simulated: true,
          message:
            'Simulated backend: no recovery codes were generated. The production backend shows new codes once and stores only their hashes.',
        });
      },
    },
    {
      method: 'POST',
      pattern: '/account/password',
      handler: ({ body }) => {
        const me = find(CURRENT_USER_ID);
        const b = (body ?? {}) as Record<string, unknown>;
        const next = typeof b.new_password === 'string' ? b.new_password : '';
        if (typeof b.current_password !== 'string' || !b.current_password)
          return invalid('current_password', 'Enter your current password.');
        const issues = passwordIssues(
          next,
          {
            minPasswordLength: u.policy.min_password_length,
            requireMixedCharacters: u.policy.require_mixed_characters,
          },
          me?.username,
        );
        if (issues.length)
          return invalid(
            'new_password',
            `The new password does not meet the policy (${issues.join(', ')}).`,
          );
        if (me) {
          me.password_set_at = new Date().toISOString();
          me.must_change_password = false;
          touch(me);
          recordAudit(state, {
            resource: 'user',
            resourceId: me.id,
            action: 'updated',
            summary: `${me.username}: password changed (simulated; no password is stored in the browser)`,
          });
        }
        persist();
        return ok({
          message:
            'Simulated: the policy was checked, but no password is stored or verified in the browser.',
        });
      },
    },
  ];
}
