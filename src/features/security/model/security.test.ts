import { describe, expect, it } from 'vitest';
import type { SecurityPolicy } from '@/shared/types/domain';
import { isTotpCode, passwordChecklist, toPolicyInput, validatePolicy } from './security';

const policy: SecurityPolicy = {
  version: 1,
  minPasswordLength: 12,
  requireMixedCharacters: true,
  passwordHistory: 5,
  lockoutThreshold: 5,
  lockoutMinutes: 15,
  sessionIdleMinutes: 30,
  sessionMaxHours: 10,
  mfaRequired: true,
  updatedAt: '',
  updatedBy: '',
};

describe('security policy rules', () => {
  it('validates ranges, idle timeout and change note', () => {
    const input = {
      ...toPolicyInput(policy),
      minPasswordLength: 8,
      sessionIdleMinutes: 300,
      sessionMaxHours: 2,
    };
    expect(validatePolicy(input)).toEqual({
      minPasswordLength: 'security.errors.range',
      sessionIdleMinutes: 'security.errors.idleTooLong',
      changeNote: 'security.errors.changeNote',
    });
  });

  it('checks passwords against the policy and the 6-digit TOTP format', () => {
    expect(passwordChecklist('short', policy, 'anna')).toEqual([
      { issue: 'length', ok: false },
      { issue: 'mixed', ok: false },
      { issue: 'username', ok: true },
    ]);
    expect(
      passwordChecklist('Anna-Strong#2026', policy, 'anna').find((c) => c.issue === 'username')?.ok,
    ).toBe(false);
    expect(passwordChecklist('Very-Strong#2026', policy, 'anna').every((c) => c.ok)).toBe(true);
    expect(isTotpCode('123456')).toBe(true);
    expect(isTotpCode('12345a')).toBe(false);
  });
});
