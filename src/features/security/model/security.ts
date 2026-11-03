import type { MessageKey } from '@/shared/i18n/translate';
import type { SecurityPolicy, SecurityPolicyInput } from '@/shared/types/domain';
import {
  passwordIssues,
  POLICY_RANGES,
  TOTP_PATTERN,
  type PasswordIssue,
} from '@/shared/utils/securityRules';

export type PolicyField = keyof typeof POLICY_RANGES | 'changeNote';
export const POLICY_KEYS = Object.keys(POLICY_RANGES) as (keyof typeof POLICY_RANGES)[];

export const toPolicyInput = (p: SecurityPolicy): SecurityPolicyInput => ({
  minPasswordLength: p.minPasswordLength,
  requireMixedCharacters: p.requireMixedCharacters,
  passwordHistory: p.passwordHistory,
  lockoutThreshold: p.lockoutThreshold,
  lockoutMinutes: p.lockoutMinutes,
  sessionIdleMinutes: p.sessionIdleMinutes,
  sessionMaxHours: p.sessionMaxHours,
  changeNote: '',
});

export function validatePolicy(i: SecurityPolicyInput): Partial<Record<PolicyField, MessageKey>> {
  const e: Partial<Record<PolicyField, MessageKey>> = {};
  for (const k of POLICY_KEYS) {
    const [min, max] = POLICY_RANGES[k];
    const v = i[k];
    if (!Number.isInteger(v) || v < min || v > max) e[k] = 'security.errors.range';
  }
  if (!e.sessionIdleMinutes && !e.sessionMaxHours && i.sessionIdleMinutes > i.sessionMaxHours * 60)
    e.sessionIdleMinutes = 'security.errors.idleTooLong';
  if (i.changeNote.trim().length < 3) e.changeNote = 'security.errors.changeNote';
  return e;
}

export const POLICY_SERVER_FIELD: Record<string, PolicyField> = {
  min_password_length: 'minPasswordLength',
  password_history: 'passwordHistory',
  lockout_threshold: 'lockoutThreshold',
  lockout_minutes: 'lockoutMinutes',
  session_idle_minutes: 'sessionIdleMinutes',
  session_max_hours: 'sessionMaxHours',
  change_note: 'changeNote',
};

/** Live checklist for a new password against the current policy. */
export function passwordChecklist(
  password: string,
  policy: SecurityPolicy,
  username: string,
): { issue: PasswordIssue; ok: boolean }[] {
  const issues = passwordIssues(password, policy, username);
  const all: PasswordIssue[] = [
    'length',
    ...(policy.requireMixedCharacters ? (['mixed'] as const) : []),
    ...(username ? (['username'] as const) : []),
  ];
  return all.map((issue) => ({ issue, ok: password.length > 0 && !issues.includes(issue) }));
}

export const isTotpCode = (code: string) => TOTP_PATTERN.test(code.trim());
