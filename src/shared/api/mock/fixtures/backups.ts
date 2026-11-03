import { BACKUP_COMPONENTS } from '@/shared/utils/backupRules';
import type { WireBackupSettings } from '../handlers/backups';

/** Manual backups only by default; every component included; always encrypted. */
export const initialBackupSettings: WireBackupSettings = {
  version: 1,
  target_volume_id: 'vol-backup',
  components: [...BACKUP_COMPONENTS],
  retention_count: 14,
  schedule: 'manual',
  schedule_time: '02:00',
  encryption_required: true,
  updated_at: '2026-09-15T09:00:00+03:00',
  updated_by: 'Synthetic administrator',
};
