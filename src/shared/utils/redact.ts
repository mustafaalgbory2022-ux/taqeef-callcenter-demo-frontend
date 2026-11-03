/**
 * Defence in depth for anything log-like shown in the UI: masks credentials, tokens, one-time
 * codes, email addresses and phone numbers. The backend must sanitize first; this is a second
 * line so a backend mistake never reaches the screen.
 */
const RULES: readonly [RegExp, string][] = [
  [/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]'],
  [
    /\b(password|passwd|pwd|secret|client_secret|api[_-]?key|token|authorization)\s*[:=]\s*("[^"]*"|'[^']*'|\S+)/gi,
    '$1=[redacted]',
  ],
  [
    /\b(otp|totp|mfa|one[- ]time|verification|recovery)(\s+code)?\s*[:=]?\s*\d{6,8}\b/gi,
    '$1$2 [redacted]',
  ],
  [/\b(recovery codes?)\s*[:=]\s*[A-Za-z0-9 ,-]+/gi, '$1: [redacted]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]'],
  [/(?<![\w-])\+?\d[\d\s-]{7,}\d\b/g, '[number]'],
];

export function redactSensitive(text: string): string {
  return RULES.reduce((s, [re, rep]) => s.replace(re, rep), text);
}
