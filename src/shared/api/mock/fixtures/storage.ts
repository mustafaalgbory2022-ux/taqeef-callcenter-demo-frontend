import type { Decoded } from '../../decode';
import type { wireRecoveryItem, wireStorageSettings } from '../../wire/storage';

export type WireStorageSettings = Decoded<typeof wireStorageSettings>;
export type WireRecoveryItem = Decoded<typeof wireRecoveryItem>;

export interface WireVolume {
  id: string;
  name: string;
  path: string;
  kind: 'local' | 'network';
  total_gb: number;
  /** Space used by the operating system and other software (synthetic). */
  base_used_gb: number;
  available: boolean;
}

/** SYNTHETIC volumes. Paths are examples; the backend reports the real mounts. */
export const volumes: WireVolume[] = [
  {
    id: 'vol-data',
    name: 'Application data',
    path: '/srv/taqeef/data',
    kind: 'local',
    total_gb: 400,
    base_used_gb: 322,
    available: true,
  },
  {
    id: 'vol-archive',
    name: 'Recording archive',
    path: '/mnt/taqeef-archive',
    kind: 'network',
    total_gb: 4000,
    base_used_gb: 1250,
    available: true,
  },
  {
    id: 'vol-backup',
    name: 'Backup target',
    path: '/mnt/taqeef-backup',
    kind: 'network',
    total_gb: 2000,
    base_used_gb: 610,
    available: true,
  },
  {
    id: 'vol-offline',
    name: 'Old NAS (offline)',
    path: '/mnt/old-nas',
    kind: 'network',
    total_gb: 0,
    base_used_gb: 0,
    available: false,
  },
];

export const initialStorageSettings: WireStorageSettings = {
  version: 1,
  locations: {
    recordings: 'vol-archive',
    transcripts: 'vol-data',
    evaluations: 'vol-data',
    reports: 'vol-data',
    logs: 'vol-data',
    backups: 'vol-backup',
  },
  // No automatic deletion by default: everything is kept until an approved policy says otherwise.
  retention: (
    ['recordings', 'transcripts', 'evaluations', 'reports', 'logs', 'backups'] as const
  ).map((category) => ({
    category,
    mode: 'keep' as const,
    days: null,
  })),
  automatic_permanent_deletion: false,
  updated_at: '2026-09-15T09:00:00+03:00',
  updated_by: 'Synthetic administrator',
};
