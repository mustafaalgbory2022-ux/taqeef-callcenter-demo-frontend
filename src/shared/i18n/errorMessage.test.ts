import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api/errors';
import { describeError, describeFieldIssue } from './errorMessage';
import { translate } from './translate';

const t = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) =>
  translate('en', key, vars);

describe('user-facing error text', () => {
  it('is always localised and never shows server text', () => {
    const err = new ApiError('conflict', 409, 'HTTP 409 Call DEMO-001 secret detail');
    expect(describeError(err, t)).toBe(t('errors.conflict'));
    expect(describeError(err, t)).not.toContain('DEMO-001');
  });

  it('appends the correlation id as a support reference', () => {
    const id = '0193a000-0000-7000-8000-0000000000aa';
    const err = new ApiError('server_error', 500, 'HTTP 500', [], 'demo.api.failure', id);
    expect(describeError(err, t)).toContain(`(Reference: ${id})`);
  });

  it('describes field rule codes, with unknown codes as a generic invalid value', () => {
    expect(describeFieldIssue({ field: 'x', reason: 'too_long' }, t)).toBe(
      'This value is too long.',
    );
    expect(describeFieldIssue({ field: 'x', reason: 'something_new' }, t)).toBe(
      'This value is not valid.',
    );
  });

  it('has Arabic text for every field reason', () => {
    for (const reason of ['required', 'too_long', 'out_of_range', 'invalid_format', 'duplicate']) {
      const ar = describeFieldIssue({ field: 'x', reason }, (k, v) => translate('ar', k, v));
      expect(ar).not.toMatch(/[a-z]/i);
    }
  });
});
