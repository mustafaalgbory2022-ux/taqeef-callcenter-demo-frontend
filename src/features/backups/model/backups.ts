import type { MessageKey } from '@/shared/i18n/translate';
import type {
  BackupComponent,
  BackupRun,
  BackupSettings,
  BackupSettingsInput,
  RestoreRequest,
} from '@/shared/types/domain';
import {
  BACKUP_COMPONENTS,
  missingRequired,
  RETENTION_RANGE,
  TIME_PATTERN,
} from '@/shared/utils/backupRules';

export const toBackupInput = (s: BackupSettings): BackupSettingsInput => ({
  targetVolumeId: s.targetVolumeId,
  components: s.components,
  retentionCount: s.retentionCount,
  schedule: s.schedule,
  scheduleTime: s.scheduleTime,
  changeNote: '',
});

export type BackupField = 'components' | 'retentionCount' | 'scheduleTime' | 'changeNote';

export function validateBackupSettings(
  i: BackupSettingsInput,
): Partial<Record<BackupField, MessageKey>> {
  const e: Partial<Record<BackupField, MessageKey>> = {};
  if (missingRequired(i.components).length) e.components = 'backups.errors.required';
  const [min, max] = RETENTION_RANGE;
  if (!Number.isInteger(i.retentionCount) || i.retentionCount < min || i.retentionCount > max)
    e.retentionCount = 'backups.errors.retention';
  if (!TIME_PATTERN.test(i.scheduleTime)) e.scheduleTime = 'backups.errors.time';
  if (i.changeNote.trim().length < 3) e.changeNote = 'backups.errors.changeNote';
  return e;
}

export const BACKUP_SERVER_FIELD: Record<string, BackupField> = {
  components: 'components',
  retention_count: 'retentionCount',
  schedule_time: 'scheduleTime',
  change_note: 'changeNote',
};

export type WizardStep = 'source' | 'components' | 'impact' | 'confirm';
export const WIZARD_STEPS: readonly WizardStep[] = ['source', 'components', 'impact', 'confirm'];

/** What a full restore overwrites, by component (shown on the impact step). */
export function restoreImpact(
  mode: RestoreRequest['mode'],
  components: readonly BackupComponent[],
): MessageKey[] {
  if (mode === 'test') return ['backups.impact.test'];
  const keys: MessageKey[] = ['backups.impact.downtime', 'backups.impact.newerLost'];
  if (components.includes('users')) keys.push('backups.impact.users');
  if (components.includes('secrets')) keys.push('backups.impact.secrets');
  if (components.includes('audit')) keys.push('backups.impact.audit');
  return keys;
}

export type RestoreBlock = 'unverified' | 'noComponents' | 'confirmText' | null;

export function restoreBlock(run: BackupRun, r: RestoreRequest): RestoreBlock {
  if (r.components.length === 0) return 'noComponents';
  if (r.mode === 'full' && run.verification.status === 'not_verified') return 'unverified';
  if (r.mode === 'full' && r.confirmText.trim() !== run.id) return 'confirmText';
  return null;
}

export const orderedComponents = (list: readonly BackupComponent[]) =>
  BACKUP_COMPONENTS.filter((c) => list.includes(c));
