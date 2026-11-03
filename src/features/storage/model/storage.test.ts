import { describe, expect, it } from 'vitest';
import type { StorageSettings, StorageVolume } from '@/shared/types/domain';
import { usedPct, volumeStatus } from '@/shared/utils/storageRules';
import { hasRisk, storageRisks, toStorageInput, validateStorage } from './storage';

const settings: StorageSettings = {
  version: 1,
  locations: {
    recordings: 'a',
    transcripts: 'a',
    evaluations: 'a',
    reports: 'a',
    logs: 'a',
    backups: 'b',
  },
  retention: (
    ['recordings', 'transcripts', 'evaluations', 'reports', 'logs', 'backups'] as const
  ).map((category) => ({ category, mode: 'keep' as const, days: null })),
  automaticPermanentDeletion: false,
  updatedAt: '',
  updatedBy: '',
};
const vol = (id: string, status: StorageVolume['status'] = 'ok'): StorageVolume => ({
  id,
  name: id,
  path: '/x',
  kind: 'local',
  totalGb: 1,
  usedGb: 0,
  status,
});

describe('storage rules', () => {
  it('computes capacity status at 80 % and 90 %', () => {
    expect(volumeStatus(79, 100)).toBe('ok');
    expect(volumeStatus(80, 100)).toBe('warning');
    expect(volumeStatus(95, 100)).toBe('critical');
    expect(volumeStatus(1, 0)).toBe('unavailable');
    expect(usedPct(150, 100)).toBe(100);
  });

  it('keeps everything by default and validates expiry and locations', () => {
    expect(settings.retention.every((r) => r.mode === 'keep')).toBe(true);
    const input = {
      ...toStorageInput(settings),
      locations: { ...settings.locations, recordings: 'off' },
      retention: settings.retention.map((r) =>
        r.category === 'logs' ? { ...r, mode: 'recover_after' as const, days: 30 } : r,
      ),
      changeNote: 'x',
    };
    expect(
      validateStorage(input, [vol('a'), vol('b'), vol('off', 'unavailable')], settings),
    ).toEqual({
      'location.recordings': 'storage.errors.unavailable',
      'retention.logs': 'storage.errors.days',
      changeNote: 'storage.errors.changeNote',
    });
    const risks = storageRisks(settings, input);
    expect(risks.moved).toEqual(['recordings']);
    expect(risks.expiring.map((r) => r.category)).toEqual(['logs']);
    expect(hasRisk(storageRisks(settings, toStorageInput(settings)))).toBe(false);
  });
});
