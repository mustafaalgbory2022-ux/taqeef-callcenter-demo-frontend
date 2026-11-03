import type {
  BackupRun,
  BackupSettings,
  BackupSettingsInput,
  MigrationReadiness,
  RestoreRequest,
  RestoreRun,
} from '@/shared/types/domain';
import { endpoints } from '../endpoints';
import { listOf, type Send } from '../send';
import {
  backupRunFromWire,
  backupSettingsFromWire,
  backupSettingsToWire,
  migrationFromWire,
  restoreRequestToWire,
  restoreRunFromWire,
  wireBackupRun,
  wireBackupSettings,
  wireMigration,
  wireRestoreRun,
} from '../wire/backups';

/**
 * Backup, verification, restore and migration readiness (PROVISIONAL routes). In mock mode
 * every run is `simulated`: nothing is copied, verified or restored.
 */
export interface BackupsApi {
  settings(): Promise<BackupSettings>;
  saveSettings(input: BackupSettingsInput): Promise<BackupSettings>;
  list(): Promise<BackupRun[]>;
  start(note: string): Promise<BackupRun>;
  verify(id: string): Promise<BackupRun>;
  restores(): Promise<RestoreRun[]>;
  restore(request: RestoreRequest): Promise<RestoreRun>;
  migrationReadiness(): Promise<MigrationReadiness>;
}

export function createBackupsApi(send: Send): BackupsApi {
  const runs = listOf(wireBackupRun, backupRunFromWire);
  const restores = listOf(wireRestoreRun, restoreRunFromWire);
  return {
    settings: () =>
      send(
        { method: 'GET', path: endpoints.backupSettings },
        wireBackupSettings,
        backupSettingsFromWire,
      ),
    saveSettings: (i) =>
      send(
        { method: 'PUT', path: endpoints.backupSettings, body: backupSettingsToWire(i) },
        wireBackupSettings,
        backupSettingsFromWire,
      ),
    list: () => send({ method: 'GET', path: endpoints.backups }, runs.decoder, runs.map),
    start: (note) =>
      send(
        { method: 'POST', path: endpoints.backups, body: { note: note.trim() } },
        wireBackupRun,
        backupRunFromWire,
      ),
    verify: (id) =>
      send({ method: 'POST', path: endpoints.backupVerify(id) }, wireBackupRun, backupRunFromWire),
    restores: () =>
      send({ method: 'GET', path: endpoints.restores }, restores.decoder, restores.map),
    restore: (r) =>
      send(
        {
          method: 'POST',
          path: endpoints.backupRestore(r.backupId),
          body: restoreRequestToWire(r),
        },
        wireRestoreRun,
        restoreRunFromWire,
      ),
    migrationReadiness: () =>
      send({ method: 'GET', path: endpoints.migrationReadiness }, wireMigration, migrationFromWire),
  };
}
