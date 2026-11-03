import type { Decoded } from '../../decode';
import type { wireBackupRun, wireBackupSettings, wireRestoreRun } from '../../wire/backups';
import {
  BACKUP_COMPONENTS,
  missingRequired,
  RETENTION_RANGE,
  TIME_PATTERN,
} from '@/shared/utils/backupRules';
import { ACTOR, recordAudit } from '../audit';
import { nextId } from '../db';
import { created, fail, invalid, ok, type Route } from '../router';
import type { MockState } from '../types';
import { categoryUsage, storageOverview } from './storage';

export type WireBackupSettings = Decoded<typeof wireBackupSettings>;
export type WireBackupRun = Decoded<typeof wireBackupRun>;
export type WireRestoreRun = Decoded<typeof wireRestoreRun>;

const SIMULATED = 'Simulated: nothing was copied, verified or restored.';
const DAY = 86_400_000;

function componentSizes(
  state: MockState,
  components: readonly WireBackupRun['components'][number]['component'][],
) {
  const u = categoryUsage(state);
  const table = {
    database: { items: state.calls.length + state.evaluations.length, size_gb: 0.35 },
    recordings: { items: u.recordings.items, size_gb: u.recordings.used_gb },
    transcripts: { items: u.transcripts.items, size_gb: u.transcripts.used_gb },
    evaluations: { items: u.evaluations.items, size_gb: u.evaluations.used_gb },
    scorecards: { items: state.scorecards.length, size_gb: 0.001 },
    users: { items: state.security.users.length, size_gb: 0.001 },
    settings: { items: 12, size_gb: 0.001 },
    audit: { items: state.adminAudit.length, size_gb: 0.02 },
    // Secrets are included only as an encrypted bundle; values are never exposed.
    secrets: {
      items:
        Number(state.pbx.connectors.some((c) => c.credential_set)) +
        Number(state.notifications.sender.credential_set),
      size_gb: 0.0001,
    },
  } as const;
  return components.map((component) => ({ component, ...table[component] }));
}

function readiness(state: MockState) {
  const b = state.backups;
  const now = Date.now();
  const latest = b.runs[0];
  const verified = b.runs.find((r) => r.verification.status !== 'not_verified');
  const tested = b.restores.find((r) => r.mode === 'test');
  const target = storageOverview(state).volumes.find((v) => v.id === b.settings.target_volume_id);
  const checks: { id: string; status: 'ready' | 'attention' | 'blocked'; detail: string }[] = [
    {
      id: 'recentBackup',
      status: !latest
        ? 'blocked'
        : now - Date.parse(latest.started_at) > 7 * DAY
          ? 'attention'
          : 'ready',
      detail: latest
        ? `Latest backup ${latest.id} (${latest.status}).`
        : 'No backup has been taken.',
    },
    {
      id: 'verified',
      status: verified
        ? verified.verification.status === 'failed'
          ? 'blocked'
          : 'attention'
        : 'blocked',
      detail: verified
        ? `Backup ${verified.id} verification: ${verified.verification.status}. Simulated results are not proof of integrity.`
        : 'No backup has been verified.',
    },
    {
      id: 'restoreTested',
      status: tested ? 'attention' : 'blocked',
      detail: tested
        ? `Test restore ${tested.id} recorded (${tested.status}).`
        : 'No test restore has been run.',
    },
    {
      id: 'coverage',
      status: missingRequired(b.settings.components).length
        ? 'blocked'
        : b.settings.components.length < BACKUP_COMPONENTS.length
          ? 'attention'
          : 'ready',
      detail: `${b.settings.components.length} of ${BACKUP_COMPONENTS.length} components are included.`,
    },
    {
      id: 'secrets',
      status: b.settings.components.includes('secrets') ? 'ready' : 'blocked',
      detail:
        'Required secrets (PBX API secret, mail client secret, MFA encryption key) are backed up encrypted.',
    },
    {
      id: 'capacity',
      status:
        !target || target.status === 'unavailable'
          ? 'blocked'
          : target.status === 'ok'
            ? 'ready'
            : 'attention',
      detail: target
        ? `Backup target ${target.name}: ${target.status}.`
        : 'Backup target not found.',
    },
    {
      id: 'backend',
      status: 'blocked',
      detail: 'The production backup service is not connected; every run here is simulated.',
    },
  ];
  const overall = checks.some((c) => c.status === 'blocked')
    ? 'blocked'
    : checks.some((c) => c.status === 'attention')
      ? 'attention'
      : 'ready';
  return { generated_at: new Date(now).toISOString(), simulated: true, overall, checks };
}

export function backupRoutes(state: MockState, persist: () => void): Route[] {
  const b = state.backups;
  const find = (id: string | undefined) => b.runs.find((r) => r.id === id);
  return [
    { method: 'GET', pattern: '/backups/settings', handler: () => ok(b.settings) },
    {
      method: 'PUT',
      pattern: '/backups/settings',
      handler: ({ body }) => {
        const x = (body ?? {}) as Record<string, unknown>;
        if (x.encryption_required !== true)
          return invalid('encryption_required', 'Backups are always encrypted.');
        const vol = state.storage.volumes.find((v) => v.id === x.target_volume_id);
        if (!vol || !vol.available)
          return invalid('target_volume_id', 'Choose an available backup location.');
        const components = Array.isArray(x.components)
          ? x.components.filter((c): c is WireBackupSettings['components'][number] =>
              (BACKUP_COMPONENTS as readonly unknown[]).includes(c),
            )
          : [];
        const missing = missingRequired(components);
        if (missing.length)
          return invalid(
            'components',
            `Required components cannot be excluded: ${missing.join(', ')}.`,
          );
        const n = x.retention_count;
        if (
          typeof n !== 'number' ||
          !Number.isInteger(n) ||
          n < RETENTION_RANGE[0] ||
          n > RETENTION_RANGE[1]
        )
          return invalid('retention_count', 'Keep 1 to 90 backups.');
        if (x.schedule !== 'manual' && x.schedule !== 'daily')
          return invalid('schedule', 'Invalid schedule.');
        if (typeof x.schedule_time !== 'string' || !TIME_PATTERN.test(x.schedule_time))
          return invalid('schedule_time', 'Use HH:MM (24-hour).');
        const note = typeof x.change_note === 'string' ? x.change_note.trim() : '';
        if (note.length < 3) return invalid('change_note', 'Describe the change.');
        const before = b.settings;
        const next: WireBackupSettings = {
          ...before,
          target_volume_id: vol.id,
          components: BACKUP_COMPONENTS.filter((c) => components.includes(c)),
          retention_count: n,
          schedule: x.schedule,
          schedule_time: x.schedule_time,
          version: before.version + 1,
          updated_at: new Date().toISOString(),
          updated_by: ACTOR,
        };
        const keys = [
          'target_volume_id',
          'components',
          'retention_count',
          'schedule',
          'schedule_time',
        ] as const;
        const changes = keys.flatMap((k) =>
          String(before[k]) === String(next[k])
            ? []
            : [{ field: k, before: String(before[k]), after: String(next[k]) }],
        );
        if (!changes.length) return fail(409, 'No changes compared with the current version.');
        b.settings = next;
        recordAudit(state, {
          resource: 'backup_settings',
          resourceId: `v${next.version}`,
          action: 'version_saved',
          summary: `Backup settings v${next.version}: ${note}`,
          changes,
        });
        persist();
        return ok(next);
      },
    },
    { method: 'GET', pattern: '/backups', handler: () => ok(b.runs) },
    {
      method: 'POST',
      pattern: '/backups',
      handler: ({ body }) => {
        const note =
          typeof (body as { note?: unknown } | null)?.note === 'string'
            ? String((body as { note: string }).note).trim()
            : '';
        if (note.length > 200) return invalid('note', 'Use at most 200 characters.');
        if (b.runs.some((r) => r.status === 'running'))
          return fail(409, 'A backup is already running.');
        const components = componentSizes(state, b.settings.components);
        const now = new Date().toISOString();
        const run: WireBackupRun = {
          id: nextId(state, 'BKP'),
          trigger: 'manual',
          status: 'simulated',
          started_at: now,
          finished_at: now,
          size_gb: Math.round(components.reduce((s, c) => s + c.size_gb, 0) * 100) / 100,
          components,
          verification: { status: 'not_verified', checked_at: null, results: [] },
          note: note || SIMULATED,
          started_by: ACTOR,
          simulated: true,
        };
        b.runs.unshift(run);
        b.runs = b.runs.slice(0, b.settings.retention_count);
        recordAudit(state, {
          resource: 'backup',
          resourceId: run.id,
          action: 'generated',
          summary: `Manual backup ${run.id} recorded (${run.size_gb} GB estimated). ${SIMULATED}`,
        });
        persist();
        return created(run);
      },
    },
    {
      method: 'POST',
      pattern: '/backups/:id/verify',
      handler: ({ params }) => {
        const run = find(params.id);
        if (!run) return fail(404, 'Backup not found.');
        run.verification = {
          status: 'simulated',
          checked_at: new Date().toISOString(),
          results: run.components.map((c) => ({
            component: c.component,
            result: 'simulated' as const,
            detail:
              c.component === 'secrets'
                ? 'Simulated: encrypted bundle not opened.'
                : 'Simulated: no checksum was computed.',
          })),
        };
        recordAudit(state, {
          resource: 'backup',
          resourceId: run.id,
          action: 'verified',
          summary: `Backup ${run.id} verification recorded (simulated — integrity not proven)`,
        });
        persist();
        return ok(run);
      },
    },
    { method: 'GET', pattern: '/backups/restores', handler: () => ok(b.restores) },
    {
      method: 'POST',
      pattern: '/backups/:id/restore',
      handler: ({ params, body }) => {
        const run = find(params.id);
        if (!run) return fail(404, 'Backup not found.');
        const x = (body ?? {}) as Record<string, unknown>;
        const mode = x.mode === 'full' || x.mode === 'test' ? x.mode : null;
        if (!mode) return invalid('mode', 'Choose a test or full restore.');
        const components = Array.isArray(x.components)
          ? x.components.filter((c): c is WireBackupSettings['components'][number] =>
              run.components.some((rc) => rc.component === c),
            )
          : [];
        if (components.length === 0)
          return invalid('components', 'Choose at least one component from this backup.');
        if (x.confirm !== true) return fail(409, 'Restores must be confirmed.');
        if (mode === 'full') {
          if (run.verification.status === 'not_verified')
            return fail(409, 'Verify the backup before a full restore.');
          if (x.confirm_text !== run.id)
            return invalid('confirm_text', `Type the backup ID (${run.id}) to confirm.`);
        }
        const now = new Date().toISOString();
        const restore: WireRestoreRun = {
          id: nextId(state, 'RST'),
          backup_id: run.id,
          mode,
          components,
          status: 'simulated',
          started_at: now,
          finished_at: now,
          message:
            mode === 'test'
              ? 'Simulated test restore into an isolated area: no data was read or changed.'
              : `${SIMULATED} The live system was not changed.`,
          started_by: ACTOR,
          simulated: true,
        };
        b.restores.unshift(restore);
        recordAudit(state, {
          resource: 'restore',
          resourceId: restore.id,
          action: 'restored',
          summary: `${mode === 'test' ? 'Test' : 'Full'} restore from ${run.id} (${components.join(', ')}) — simulated`,
        });
        persist();
        return created(restore);
      },
    },
    { method: 'GET', pattern: '/backups/migration-readiness', handler: () => ok(readiness(state)) },
  ];
}
