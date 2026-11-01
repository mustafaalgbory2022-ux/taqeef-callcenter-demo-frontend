import { describe, expect, it } from 'vitest';
import { checkTemplate, isEmail, renderTemplate } from './emailRules';

describe('email rules', () => {
  it('validates addresses', () => {
    expect(isEmail('quality@example.invalid')).toBe(true);
    expect(isEmail('not an email')).toBe(false);
    expect(isEmail('a@b')).toBe(false);
  });

  it('checks template placeholders across subject and body and renders values', () => {
    expect(
      checkTemplate('low_quality_alert', 'Low score {call_id}', 'Agent {agent} {foo}'),
    ).toEqual({
      missing: ['result'],
      unknown: ['foo'],
    });
    expect(renderTemplate('Call {call_id} – {unknown}', { call_id: 'DEMO-1' })).toBe(
      'Call DEMO-1 – {unknown}',
    );
  });
});
