import type { BackupComponent } from '@/shared/types/domain';

/** Backup rules shared by the forms and the simulated backend (PROVISIONAL). */

export const BACKUP_COMPONENTS: readonly BackupComponent[] = [
  'database',
  'recordings',
  'transcripts',
  'evaluations',
  'scorecards',
  'users',
  'settings',
  'audit',
  'secrets',
];

/** Always included: without these a restore cannot rebuild a working, auditable system. */
export const REQUIRED_COMPONENTS: readonly BackupComponent[] = [
  'database',
  'evaluations',
  'scorecards',
  'users',
  'settings',
  'audit',
  'secrets',
];

export const RETENTION_RANGE = [1, 90] as const;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const missingRequired = (components: readonly BackupComponent[]) =>
  REQUIRED_COMPONENTS.filter((c) => !components.includes(c));
