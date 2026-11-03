import type { MessageKey } from '@/shared/i18n/translate';
import type {
  RetentionRule,
  StorageCategory,
  StorageSettings,
  StorageSettingsInput,
  StorageVolume,
} from '@/shared/types/domain';
import {
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  REASON_MIN,
  STORAGE_CATEGORIES,
} from '@/shared/utils/storageRules';

export const toStorageInput = (s: StorageSettings): StorageSettingsInput => ({
  locations: s.locations,
  retention: s.retention,
  changeNote: '',
});

export type StorageErrors = Partial<
  Record<`location.${StorageCategory}` | `retention.${StorageCategory}` | 'changeNote', MessageKey>
>;

export function validateStorage(
  i: StorageSettingsInput,
  volumes: readonly StorageVolume[],
  current: StorageSettings,
): StorageErrors {
  const e: StorageErrors = {};
  for (const c of STORAGE_CATEGORIES) {
    const v = volumes.find((x) => x.id === i.locations[c]);
    if (!v) e[`location.${c}`] = 'storage.errors.location';
    else if (v.status === 'unavailable' && current.locations[c] !== v.id)
      e[`location.${c}`] = 'storage.errors.unavailable';
    const r = i.retention.find((x) => x.category === c);
    if (
      r?.mode === 'recover_after' &&
      (r.days === null ||
        !Number.isInteger(r.days) ||
        r.days < MIN_RETENTION_DAYS ||
        r.days > MAX_RETENTION_DAYS)
    )
      e[`retention.${c}`] = 'storage.errors.days';
  }
  if (i.changeNote.trim().length < 3) e.changeNote = 'storage.errors.changeNote';
  return e;
}

export const STORAGE_SERVER_FIELD: Record<string, keyof StorageErrors> = {
  ...Object.fromEntries(
    STORAGE_CATEGORIES.flatMap((c) => [
      [`location_${c}`, `location.${c}`],
      [`retention_${c}`, `retention.${c}`],
    ]),
  ),
  change_note: 'changeNote',
};

export interface StorageRisks {
  moved: StorageCategory[];
  expiring: RetentionRule[];
}

/** Changes that move data or start moving items to recovery — confirmed with warnings. */
export function storageRisks(current: StorageSettings, next: StorageSettingsInput): StorageRisks {
  return {
    moved: STORAGE_CATEGORIES.filter((c) => current.locations[c] !== next.locations[c]),
    expiring: next.retention.filter((r) => {
      const before = current.retention.find((x) => x.category === r.category);
      return (
        r.mode === 'recover_after' && (before?.mode !== 'recover_after' || before.days !== r.days)
      );
    }),
  };
}

export const hasRisk = (r: StorageRisks) => r.moved.length > 0 || r.expiring.length > 0;

export const validReason = (reason: string) => reason.trim().length >= REASON_MIN;
