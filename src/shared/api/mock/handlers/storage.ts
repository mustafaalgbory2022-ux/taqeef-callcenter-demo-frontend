import {
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  REASON_MIN,
  STORAGE_CATEGORIES,
  volumeStatus,
} from '@/shared/utils/storageRules';
import { ACTOR, recordAudit } from '../audit';
import { nextId } from '../db';
import type { WireRecoveryItem, WireStorageSettings } from '../fixtures/storage';
import { created, fail, invalid, ok, type Route } from '../router';
import type { MockState } from '../types';

/** Average synthetic item sizes (MB) used to estimate usage from the synthetic dataset. */
const SIZE_MB = { recording: 1.4, transcript: 0.012, evaluation: 0.004, report: 0.2 } as const;
const LOGS_GB = 0.8;

export const isRecoverable = (state: MockState, type: WireRecoveryItem['item_type'], id: string) =>
  state.storage.recovery.some(
    (r) => r.item_type === type && r.item_id === id && r.status === 'recoverable',
  );

export function categoryUsage(state: MockState) {
  const calls = state.calls;
  const withAudio = calls.filter(
    (c) => c.duration_ms !== null && !isRecoverable(state, 'recording', c.id),
  );
  const gb = (mb: number) => Math.round((mb / 1024) * 100) / 100;
  const oldest = (dates: string[]) =>
    dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null;
  const backupGb = state.backups ? state.backups.runs.reduce((s, r) => s + r.size_gb, 0) : 0;
  return {
    recordings: {
      used_gb: gb(withAudio.length * SIZE_MB.recording),
      items: withAudio.length,
      oldest_item_at: oldest(withAudio.map((c) => c.recorded_at)),
    },
    transcripts: {
      used_gb: gb(Object.keys(state.transcripts).length * SIZE_MB.transcript),
      items: Object.keys(state.transcripts).length,
      oldest_item_at: oldest(calls.map((c) => c.recorded_at)),
    },
    evaluations: {
      used_gb: gb(state.evaluations.length * SIZE_MB.evaluation),
      items: state.evaluations.length,
      oldest_item_at: oldest(state.evaluations.map((e) => e.created_at)),
    },
    reports: {
      used_gb: gb(state.reports.length * SIZE_MB.report),
      items: state.reports.length,
      oldest_item_at: oldest(state.reports.map((r) => r.created_at)),
    },
    logs: {
      used_gb: LOGS_GB,
      items: state.adminAudit.length,
      oldest_item_at: oldest(state.adminAudit.map((e) => e.at)),
    },
    backups: {
      used_gb: Math.round(backupGb * 100) / 100,
      items: state.backups?.runs.length ?? 0,
      oldest_item_at: oldest(state.backups?.runs.map((r) => r.started_at) ?? []),
    },
  };
}

export function storageOverview(state: MockState) {
  const usage = categoryUsage(state);
  const loc = state.storage.settings.locations;
  return {
    generated_at: new Date().toISOString(),
    simulated: true,
    warning_pct: 80,
    critical_pct: 90,
    volumes: state.storage.volumes.map((v) => {
      const used =
        v.base_used_gb +
        STORAGE_CATEGORIES.filter((c) => loc[c] === v.id).reduce((s, c) => s + usage[c].used_gb, 0);
      return {
        id: v.id,
        name: v.name,
        path: v.path,
        kind: v.kind,
        total_gb: v.total_gb,
        used_gb: Math.round(used * 100) / 100,
        status: v.available ? volumeStatus(used, v.total_gb) : 'unavailable',
      };
    }),
    categories: STORAGE_CATEGORIES.map((c) => ({ category: c, volume_id: loc[c], ...usage[c] })),
  };
}

export function storageRoutes(state: MockState, persist: () => void): Route[] {
  const st = state.storage;
  const label = (type: WireRecoveryItem['item_type'], id: string) => {
    if (type === 'report') return state.reports.find((r) => r.id === id)?.title ?? null;
    const call = state.calls.find((c) => c.id === id);
    if (!call) return null;
    if (type === 'transcript' && !state.transcripts[id]) return null;
    return `${call.title} (${type})`;
  };

  return [
    { method: 'GET', pattern: '/storage/overview', handler: () => ok(storageOverview(state)) },
    { method: 'GET', pattern: '/storage/settings', handler: () => ok(st.settings) },
    {
      method: 'PUT',
      pattern: '/storage/settings',
      handler: ({ body }) => {
        const b = (body ?? {}) as Record<string, unknown>;
        const locations = (b.locations ?? {}) as Record<string, unknown>;
        for (const c of STORAGE_CATEGORIES) {
          const v = st.volumes.find((x) => x.id === locations[c]);
          if (!v) return invalid(`location_${c}`, 'Choose a known storage location.');
          if (!v.available && st.settings.locations[c] !== v.id)
            return invalid(`location_${c}`, 'This location is unavailable.');
        }
        const retention = Array.isArray(b.retention)
          ? (b.retention as Record<string, unknown>[])
          : [];
        if (STORAGE_CATEGORIES.some((c) => !retention.some((r) => r.category === c)))
          return invalid('retention', 'Every category needs a retention rule.');
        for (const r of retention) {
          if (r.mode === 'keep') continue;
          if (r.mode !== 'recover_after')
            return invalid(`retention_${String(r.category)}`, 'Invalid retention mode.');
          const d = r.days;
          if (
            typeof d !== 'number' ||
            !Number.isInteger(d) ||
            d < MIN_RETENTION_DAYS ||
            d > MAX_RETENTION_DAYS
          )
            return invalid(
              `retention_${String(r.category)}`,
              `Retention must be ${MIN_RETENTION_DAYS}–${MAX_RETENTION_DAYS} days.`,
            );
        }
        const note = typeof b.change_note === 'string' ? b.change_note.trim() : '';
        if (note.length < 3) return invalid('change_note', 'Describe the change.');
        const before = st.settings;
        const next: WireStorageSettings = {
          ...before,
          locations: Object.fromEntries(
            STORAGE_CATEGORIES.map((c) => [c, String(locations[c])]),
          ) as WireStorageSettings['locations'],
          retention: STORAGE_CATEGORIES.map((c) => {
            const r = retention.find((x) => x.category === c) ?? {};
            return {
              category: c,
              mode: r.mode === 'recover_after' ? 'recover_after' : 'keep',
              days: r.mode === 'recover_after' ? (r.days as number) : null,
            };
          }),
          version: before.version + 1,
          updated_at: new Date().toISOString(),
          updated_by: ACTOR,
        };
        const changes = [
          ...STORAGE_CATEGORIES.flatMap((c) =>
            before.locations[c] === next.locations[c]
              ? []
              : [{ field: `location.${c}`, before: before.locations[c], after: next.locations[c] }],
          ),
          ...STORAGE_CATEGORIES.flatMap((c) => {
            const a = before.retention.find((r) => r.category === c);
            const z = next.retention.find((r) => r.category === c);
            const fmt = (r: typeof a) =>
              r?.mode === 'recover_after' ? `recover after ${r.days} days` : 'keep';
            return fmt(a) === fmt(z)
              ? []
              : [{ field: `retention.${c}`, before: fmt(a), after: fmt(z) }];
          }),
        ];
        if (changes.length === 0) return fail(409, 'No changes compared with the current version.');
        // Moving data or enabling expiry are high-risk: they need explicit confirmation.
        const risky = changes.some(
          (c) => c.field.startsWith('location.') || c.after.startsWith('recover'),
        );
        if (risky && b.confirm !== true)
          return fail(409, 'Location changes and retention expiry must be confirmed.');
        st.settings = next;
        recordAudit(state, {
          resource: 'storage_settings',
          resourceId: `v${next.version}`,
          action: 'version_saved',
          summary: `Storage settings v${next.version}: ${note}`,
          changes,
        });
        persist();
        return ok(next);
      },
    },
    { method: 'GET', pattern: '/storage/recovery', handler: () => ok(st.recovery) },
    {
      method: 'POST',
      pattern: '/storage/recovery',
      handler: ({ body }) => {
        const b = (body ?? {}) as Record<string, unknown>;
        const type = (['recording', 'transcript', 'report'] as const).find(
          (x) => x === b.item_type,
        );
        if (!type) return invalid('item_type', 'Choose what to move to recovery.');
        const id = typeof b.item_id === 'string' ? b.item_id.trim() : '';
        const name = label(type, id);
        if (!name) return invalid('item_id', 'No item with this ID exists.');
        if (isRecoverable(state, type, id)) return fail(409, 'This item is already in recovery.');
        const reason = typeof b.reason === 'string' ? b.reason.trim() : '';
        if (reason.length < REASON_MIN)
          return invalid('reason', `Give a reason of at least ${REASON_MIN} characters.`);
        if (b.confirm !== true) return fail(409, 'Moving an item to recovery must be confirmed.');
        const item: WireRecoveryItem = {
          id: nextId(state, 'rcv'),
          item_type: type,
          item_id: id,
          label: name,
          reason,
          size_mb:
            type === 'recording'
              ? SIZE_MB.recording
              : type === 'transcript'
                ? SIZE_MB.transcript
                : SIZE_MB.report,
          status: 'recoverable',
          deleted_at: new Date().toISOString(),
          deleted_by: ACTOR,
          restored_at: null,
          restored_by: null,
        };
        st.recovery.unshift(item);
        recordAudit(state, {
          resource: 'storage_item',
          resourceId: id,
          action: 'soft_deleted',
          summary: `${type} ${id} moved to recovery: ${reason}`,
        });
        persist();
        return created(item);
      },
    },
    {
      method: 'POST',
      pattern: '/storage/recovery/:id/restore',
      handler: ({ params }) => {
        const item = st.recovery.find((r) => r.id === params.id);
        if (!item) return fail(404, 'Recovery item not found.');
        if (item.status !== 'recoverable') return fail(409, 'This item has already been restored.');
        item.status = 'restored';
        item.restored_at = new Date().toISOString();
        item.restored_by = ACTOR;
        recordAudit(state, {
          resource: 'storage_item',
          resourceId: item.item_id,
          action: 'restored',
          summary: `${item.item_type} ${item.item_id} restored from recovery`,
        });
        persist();
        return ok(item);
      },
    },
  ];
}
