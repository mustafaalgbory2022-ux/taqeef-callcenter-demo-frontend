import type { StorageCategory, VolumeStatus } from '@/shared/types/domain';

/** Storage and retention rules shared by forms and the simulated backend (PROVISIONAL). */

export const STORAGE_CATEGORIES: readonly StorageCategory[] = [
  'recordings',
  'transcripts',
  'evaluations',
  'reports',
  'logs',
  'backups',
];

/** Shortest retention before items may move to recovery; nothing is removed sooner. */
export const MIN_RETENTION_DAYS = 90;
export const MAX_RETENTION_DAYS = 3650;
export const RECOVERY_WINDOW_DAYS = 30;
export const REASON_MIN = 10;

export function volumeStatus(
  usedGb: number,
  totalGb: number,
  warningPct = 80,
  criticalPct = 90,
): VolumeStatus {
  if (totalGb <= 0) return 'unavailable';
  const pct = (usedGb / totalGb) * 100;
  return pct >= criticalPct ? 'critical' : pct >= warningPct ? 'warning' : 'ok';
}

export const usedPct = (usedGb: number, totalGb: number) =>
  totalGb > 0 ? Math.min(100, (usedGb / totalGb) * 100) : 0;
