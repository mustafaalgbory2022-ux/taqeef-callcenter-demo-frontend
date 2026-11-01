import { describe, expect, it } from 'vitest';
import type { ReportSettings } from '@/shared/types/domain';
import { differsFromApproved } from '@/shared/utils/reportRules';
import {
  recentWeeks,
  toSettingsInput,
  validateReportSettings,
  validateRun,
} from './reportSettings';

const settings: ReportSettings = {
  version: 1,
  callsPerAgent: 5,
  minDurationSeconds: 60,
  answeredOnly: true,
  defaultQueueIds: ['q-6001'],
  agentSelection: 'all_active',
  defaultAgentIds: [],
  delivery: 'download_only',
  automaticScheduling: false,
  schedulingAuthorized: false,
  updatedAt: '',
  updatedBy: '',
};

describe('report configuration rules', () => {
  it('validates sampling settings and flags departures from the approved policy', () => {
    const input = { ...toSettingsInput(settings), callsPerAgent: 0, minDurationSeconds: 20 };
    expect(validateReportSettings(input)).toEqual({
      callsPerAgent: 'reportSettings.errors.callsPerAgent',
      minDurationSeconds: 'reportSettings.errors.minDuration',
      changeNote: 'reportSettings.errors.changeNote',
    });
    expect(differsFromApproved(5, 60)).toBe(false);
    expect(differsFromApproved(6, 60)).toBe(true);
  });

  it('lists complete Saturday–Friday weeks and validates runs', () => {
    const weeks = recentWeeks('2026-11-01', 2); // Sunday
    expect(weeks).toEqual([
      { from: '2026-10-24', to: '2026-10-30' },
      { from: '2026-10-17', to: '2026-10-23' },
    ]);
    expect(recentWeeks('2026-10-30', 1)).toEqual([{ from: '2026-10-24', to: '2026-10-30' }]); // Friday
    const run = {
      period: 'weekly' as const,
      range: weeks[0] ?? { from: '', to: '' },
      agentIds: ['a'],
      queueIds: ['q'],
      deliver: false,
    };
    expect(validateRun(run, '2026-11-01')).toBeNull();
    expect(validateRun({ ...run, agentIds: [] }, '2026-11-01')).toBe('agents');
    expect(
      validateRun({ ...run, range: { from: '2026-10-31', to: '2026-11-06' } }, '2026-11-01'),
    ).toBe('future');
  });
});
