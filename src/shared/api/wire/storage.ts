import type {
  RecoveryItem,
  StorageCategory,
  StorageOverview,
  StorageSettings,
  StorageSettingsInput,
} from '@/shared/types/domain';
import {
  arrayOf,
  DecodeError,
  nullable,
  num,
  object,
  oneOf,
  str,
  bool,
  type Decoded,
  type Decoder,
} from '../decode';

/* PROVISIONAL wire shapes for storage, retention and the recovery area. */

const CATEGORIES = [
  'recordings',
  'transcripts',
  'evaluations',
  'reports',
  'logs',
  'backups',
] as const;

export const wireOverview = object({
  generated_at: str,
  simulated: bool,
  warning_pct: num,
  critical_pct: num,
  volumes: arrayOf(
    object({
      id: str,
      name: str,
      path: str,
      kind: oneOf(['local', 'network']),
      total_gb: num,
      used_gb: num,
      status: oneOf(['ok', 'warning', 'critical', 'unavailable']),
    }),
  ),
  categories: arrayOf(
    object({
      category: oneOf(CATEGORIES),
      used_gb: num,
      items: num,
      volume_id: str,
      oldest_item_at: nullable(str),
    }),
  ),
});

export function overviewFromWire(w: Decoded<typeof wireOverview>): StorageOverview {
  return {
    generatedAt: w.generated_at,
    simulated: w.simulated,
    warningPct: w.warning_pct,
    criticalPct: w.critical_pct,
    volumes: w.volumes.map((v) => ({
      id: v.id,
      name: v.name,
      path: v.path,
      kind: v.kind,
      totalGb: v.total_gb,
      usedGb: v.used_gb,
      status: v.status,
    })),
    categories: w.categories.map((c) => ({
      category: c.category,
      usedGb: c.used_gb,
      items: c.items,
      volumeId: c.volume_id,
      oldestItemAt: c.oldest_item_at,
    })),
  };
}

const locations: Decoder<Record<StorageCategory, string>> = (v, path = '') => {
  const o = object(
    Object.fromEntries(CATEGORIES.map((c) => [c, str])) as Record<StorageCategory, Decoder<string>>,
  )(v, path);
  return o;
};

const falseOnly: Decoder<false> = (v, path = '') => {
  if (v !== false) throw new DecodeError(path, 'false (no automatic permanent deletion)');
  return false;
};

export const wireStorageSettings = object({
  version: num,
  locations,
  retention: arrayOf(
    object({
      category: oneOf(CATEGORIES),
      mode: oneOf(['keep', 'recover_after']),
      days: nullable(num),
    }),
  ),
  automatic_permanent_deletion: falseOnly,
  updated_at: str,
  updated_by: str,
});

export function storageSettingsFromWire(w: Decoded<typeof wireStorageSettings>): StorageSettings {
  return {
    version: w.version,
    locations: w.locations,
    retention: w.retention,
    automaticPermanentDeletion: w.automatic_permanent_deletion,
    updatedAt: w.updated_at,
    updatedBy: w.updated_by,
  };
}

export const storageSettingsToWire = (i: StorageSettingsInput, confirm: boolean) => ({
  locations: { ...i.locations },
  retention: i.retention.map((r) => ({
    category: r.category,
    mode: r.mode,
    days: r.mode === 'keep' ? null : r.days,
  })),
  change_note: i.changeNote.trim(),
  confirm,
});

export const wireRecoveryItem = object({
  id: str,
  item_type: oneOf(['recording', 'transcript', 'report']),
  item_id: str,
  label: str,
  reason: str,
  size_mb: num,
  status: oneOf(['recoverable', 'restored']),
  deleted_at: str,
  deleted_by: str,
  restored_at: nullable(str),
  restored_by: nullable(str),
});

export function recoveryItemFromWire(w: Decoded<typeof wireRecoveryItem>): RecoveryItem {
  return {
    id: w.id,
    itemType: w.item_type,
    itemId: w.item_id,
    label: w.label,
    reason: w.reason,
    sizeMb: w.size_mb,
    status: w.status,
    deletedAt: w.deleted_at,
    deletedBy: w.deleted_by,
    restoredAt: w.restored_at,
    restoredBy: w.restored_by,
  };
}
