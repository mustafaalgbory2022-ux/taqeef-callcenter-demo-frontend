import type { Decoded } from '../../decode';
import type { wireReportSettings } from '../../wire/reportSettings';

export type WireReportSettings = Decoded<typeof wireReportSettings>;

export const initialReportSettings: WireReportSettings = {
  version: 1,
  calls_per_agent: 5,
  min_duration_s: 60,
  answered_only: true,
  default_queue_ids: ['q-6001', 'q-6002'],
  agent_selection: 'all_active',
  default_agent_ids: [],
  delivery: 'download_only',
  automatic_scheduling: false,
  // Automatic scheduling has not been authorized; only manual generation is allowed.
  scheduling_authorized: false,
  updated_at: '2026-09-15T09:00:00+03:00',
  updated_by: 'Synthetic administrator',
};
