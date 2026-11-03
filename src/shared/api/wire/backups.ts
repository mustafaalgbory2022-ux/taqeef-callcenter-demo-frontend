import type {
  BackupRun,
  BackupSettings,
  BackupSettingsInput,
  MigrationReadiness,
  RestoreRequest,
  RestoreRun,
} from '@/shared/types/domain';
import {
  arrayOf,
  bool,
  DecodeError,
  nullable,
  num,
  object,
  oneOf,
  str,
  type Decoded,
  type Decoder,
} from '../decode';

/* PROVISIONAL wire shapes for backups, verification, restore and migration readiness. */

const COMPONENTS = [
  'database',
  'recordings',
  'transcripts',
  'evaluations',
  'scorecards',
  'users',
  'settings',
  'audit',
  'secrets',
] as const;

const alwaysTrue: Decoder<true> = (v, path = '') => {
  if (v !== true) throw new DecodeError(path, 'true (backups are always encrypted)');
  return true;
};

export const wireBackupSettings = object({
  version: num,
  target_volume_id: str,
  components: arrayOf(oneOf(COMPONENTS)),
  retention_count: num,
  schedule: oneOf(['manual', 'daily']),
  schedule_time: str,
  encryption_required: alwaysTrue,
  updated_at: str,
  updated_by: str,
});

export function backupSettingsFromWire(w: Decoded<typeof wireBackupSettings>): BackupSettings {
  return {
    version: w.version,
    targetVolumeId: w.target_volume_id,
    components: w.components,
    retentionCount: w.retention_count,
    schedule: w.schedule,
    scheduleTime: w.schedule_time,
    encryptionRequired: w.encryption_required,
    updatedAt: w.updated_at,
    updatedBy: w.updated_by,
  };
}

export const backupSettingsToWire = (i: BackupSettingsInput) => ({
  target_volume_id: i.targetVolumeId,
  components: [...i.components],
  retention_count: i.retentionCount,
  schedule: i.schedule,
  schedule_time: i.scheduleTime,
  encryption_required: true,
  change_note: i.changeNote.trim(),
});

export const wireBackupRun = object({
  id: str,
  trigger: oneOf(['manual', 'scheduled']),
  status: oneOf(['simulated', 'running', 'completed', 'failed']),
  started_at: str,
  finished_at: nullable(str),
  size_gb: num,
  components: arrayOf(object({ component: oneOf(COMPONENTS), items: num, size_gb: num })),
  verification: object({
    status: oneOf(['not_verified', 'simulated', 'passed', 'failed']),
    checked_at: nullable(str),
    results: arrayOf(
      object({
        component: oneOf(COMPONENTS),
        result: oneOf(['simulated', 'passed', 'failed']),
        detail: str,
      }),
    ),
  }),
  note: str,
  started_by: str,
  simulated: bool,
});

export function backupRunFromWire(w: Decoded<typeof wireBackupRun>): BackupRun {
  return {
    id: w.id,
    trigger: w.trigger,
    status: w.status,
    startedAt: w.started_at,
    finishedAt: w.finished_at,
    sizeGb: w.size_gb,
    components: w.components.map((c) => ({
      component: c.component,
      items: c.items,
      sizeGb: c.size_gb,
    })),
    verification: {
      status: w.verification.status,
      checkedAt: w.verification.checked_at,
      results: w.verification.results,
    },
    note: w.note,
    startedBy: w.started_by,
    simulated: w.simulated,
  };
}

export const wireRestoreRun = object({
  id: str,
  backup_id: str,
  mode: oneOf(['test', 'full']),
  components: arrayOf(oneOf(COMPONENTS)),
  status: oneOf(['simulated', 'running', 'completed', 'failed']),
  started_at: str,
  finished_at: nullable(str),
  message: str,
  started_by: str,
  simulated: bool,
});

export function restoreRunFromWire(w: Decoded<typeof wireRestoreRun>): RestoreRun {
  return {
    id: w.id,
    backupId: w.backup_id,
    mode: w.mode,
    components: w.components,
    status: w.status,
    startedAt: w.started_at,
    finishedAt: w.finished_at,
    message: w.message,
    startedBy: w.started_by,
    simulated: w.simulated,
  };
}

export const restoreRequestToWire = (r: RestoreRequest) => ({
  mode: r.mode,
  components: [...r.components],
  confirm_text: r.confirmText.trim(),
  confirm: true,
});

export const wireMigration = object({
  generated_at: str,
  simulated: bool,
  overall: oneOf(['ready', 'attention', 'blocked']),
  checks: arrayOf(
    object({ id: str, status: oneOf(['ready', 'attention', 'blocked']), detail: str }),
  ),
});

export const migrationFromWire = (w: Decoded<typeof wireMigration>): MigrationReadiness => ({
  generatedAt: w.generated_at,
  simulated: w.simulated,
  overall: w.overall,
  checks: w.checks,
});
