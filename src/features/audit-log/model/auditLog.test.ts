import { describe, expect, it } from 'vitest';
import type { AdminAuditEntry } from '@/shared/types/domain';
import { auditSheet, compactQuery, isValidAuditRange, pageOf } from './auditLog';

const entry: AdminAuditEntry = {
  id: 'a1',
  resource: 'user',
  resourceId: 'usr-1',
  action: 'role_changed',
  actor: 'Admin',
  at: '2026-11-01T10:00:00Z',
  summary: 'Role changed',
  changes: [{ field: 'role', before: 'viewer', after: 'admin' }],
  result: 'success',
  correlationId: 'cid-1',
  simulated: true,
};

describe('audit log helpers', () => {
  it('builds export rows with every recorded field', () => {
    const sheet = auditSheet('Audit', ['h'], [entry]);
    expect(sheet.rows[1]).toEqual([
      '2026-11-01T10:00:00Z',
      'Admin',
      'role_changed',
      'user',
      'usr-1',
      'success',
      'cid-1',
      'Role changed',
      'role: viewer → admin',
      'simulated',
    ]);
  });

  it('pages, validates ranges and compacts queries', () => {
    expect(pageOf([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(isValidAuditRange({ from: '2026-11-02', to: '2026-11-01' })).toBe(false);
    expect(compactQuery({ search: '', result: 'denied', action: undefined })).toEqual({
      result: 'denied',
    });
  });
});
