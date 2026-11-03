import type { Permission, SecurityPolicyInput, UserRole } from '@/shared/types/domain';

/** Account and authentication rules shared by forms and the simulated backend (PROVISIONAL). */

export const USERNAME_PATTERN = /^[a-z][a-z0-9._-]{2,31}$/;
/** Six-digit TOTP code (RFC 6238), as shown by Microsoft Authenticator. */
export const TOTP_PATTERN = /^\d{6}$/;
export const MFA_RESET_REASON_MIN = 10;

export const POLICY_RANGES: Readonly<
  Record<
    Exclude<keyof SecurityPolicyInput, 'requireMixedCharacters' | 'changeNote'>,
    readonly [number, number]
  >
> = {
  minPasswordLength: [12, 64],
  passwordHistory: [0, 24],
  lockoutThreshold: [3, 10],
  lockoutMinutes: [5, 120],
  sessionIdleMinutes: [5, 480],
  sessionMaxHours: [1, 24],
};

export type PasswordIssue = 'length' | 'mixed' | 'username';

export function passwordIssues(
  password: string,
  policy: Pick<SecurityPolicyInput, 'minPasswordLength' | 'requireMixedCharacters'>,
  username = '',
): PasswordIssue[] {
  const issues: PasswordIssue[] = [];
  if (password.length < policy.minPasswordLength) issues.push('length');
  if (
    policy.requireMixedCharacters &&
    !(
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
    )
  )
    issues.push('mixed');
  if (username && password.toLowerCase().includes(username.toLowerCase())) issues.push('username');
  return issues;
}

/** Read-only users can view everything and export reports; administrators can do everything. */
export const VIEWER_PERMISSIONS: readonly Permission[] = ['reports.export'];

export const ROLE_IDS: readonly UserRole[] = ['admin', 'viewer'];
