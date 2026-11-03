import { describe, expect, it } from 'vitest';
import { redactSensitive } from './redact';

describe('log redaction', () => {
  it('masks credentials, tokens and one-time codes', () => {
    expect(redactSensitive('login failed password=Hunter2! for user x')).toBe(
      'login failed password=[redacted] for user x',
    );
    expect(redactSensitive('client_secret: "abc def"')).toBe('client_secret=[redacted]');
    expect(redactSensitive('Authorization: Bearer eyJhbGciOi.x.y')).not.toContain('eyJ');
    expect(redactSensitive('TOTP code 123456 rejected')).toBe('TOTP code [redacted] rejected');
  });

  it('masks contact details but keeps ids and timings', () => {
    expect(redactSensitive('sent to lead@example.invalid')).toBe('sent to [email]');
    expect(redactSensitive('caller +964 770 123 4567 dropped')).toBe('caller [number] dropped');
    expect(redactSensitive('job-5 for C-1028-03 timed out after 30000 ms')).toBe(
      'job-5 for C-1028-03 timed out after 30000 ms',
    );
  });
});
