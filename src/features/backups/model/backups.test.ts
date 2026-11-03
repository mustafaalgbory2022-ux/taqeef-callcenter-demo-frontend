import { describe, expect, it } from 'vitest';
import type { BackupRun, BackupSettings } from '@/shared/types/domain';
import { restoreBlock, restoreImpact, toBackupInput, validateBackupSettings } from './backups';

const settings: BackupSettings = {
  version: 1,
  targetVolumeId: 'v',
  components: [
    'database',
    'recordings',
    'transcripts',
    'evaluations',
    'scorecards',
    'users',
    'settings',
    'audit',
    'secrets',
  ],
  retentionCount: 14,
  schedule: 'manual',
  scheduleTime: '02:00',
  encryptionRequired: true,
  updatedAt: '',
  updatedBy: '',
};
const run = {
  id: 'BKP-1',
  verification: { status: 'not_verified', checkedAt: null, results: [] },
} as unknown as BackupRun;

describe('backup and restore rules', () => {
  it('requires the core components and valid retention and time', () => {
    const input = {
      ...toBackupInput(settings),
      components: ['recordings' as const],
      retentionCount: 0,
      scheduleTime: '25:00',
    };
    expect(validateBackupSettings(input)).toEqual({
      components: 'backups.errors.required',
      retentionCount: 'backups.errors.retention',
      scheduleTime: 'backups.errors.time',
      changeNote: 'backups.errors.changeNote',
    });
  });

  it('blocks full restores until verified and the backup id is typed', () => {
    const r = {
      backupId: 'BKP-1',
      mode: 'full' as const,
      components: ['database' as const],
      confirmText: '',
    };
    expect(restoreBlock(run, r)).toBe('unverified');
    const verified = {
      ...run,
      verification: { ...run.verification, status: 'simulated' as const },
    };
    expect(restoreBlock(verified, r)).toBe('confirmText');
    expect(restoreBlock(verified, { ...r, confirmText: 'BKP-1' })).toBeNull();
    expect(restoreBlock(run, { ...r, mode: 'test' })).toBeNull();
    expect(restoreImpact('full', ['users', 'secrets'])).toContain('backups.impact.secrets');
    expect(restoreImpact('test', ['users'])).toEqual(['backups.impact.test']);
  });
});
