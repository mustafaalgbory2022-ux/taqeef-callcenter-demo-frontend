import { describe, expect, it } from 'vitest';
import type { PbxConnector } from '@/shared/types/domain';
import { yeastarP550 } from '../vendors/yeastar';
import {
  impactfulChanges,
  needsConfirmation,
  toConnectorInput,
  validateConnector,
  validateSyncRange,
} from './pbx';

const connector: PbxConnector = {
  id: 'p',
  vendor: 'yeastar_p550',
  name: 'Main PBX',
  settings: { host: '', port: 443, use_tls: true, verify_certificate: true, api_client_id: '' },
  credentialSet: false,
  credentialUpdatedAt: null,
  queueIds: ['q-6001', 'q-6002'],
  ingestionStartDate: '2026-08-01',
  pollIntervalMinutes: 5,
  enabled: false,
  state: 'not_configured',
  stateMessage: '',
  checkedAt: null,
  lastSync: null,
  updatedAt: '',
  simulated: true,
};

describe('PBX connector rules', () => {
  it('validates vendor settings, the start date and the write-only secret', () => {
    const input = toConnectorInput(connector, yeastarP550);
    expect(validateConnector(input, yeastarP550, false, '2026-11-01')).toEqual({
      host: 'pbxAdmin.errors.required',
      api_client_id: 'pbxAdmin.errors.clientId',
      secret: 'pbxAdmin.errors.secretRequired',
    });
    const ok = {
      ...input,
      settings: { ...input.settings, host: 'pbx.local', api_client_id: 'client01' },
      secret: 'long-enough-secret',
    };
    expect(validateConnector(ok, yeastarP550, false, '2026-11-01')).toEqual({});
    expect(
      validateConnector(
        {
          ...ok,
          settings: { ...ok.settings, host: 'https://pbx.local/api', use_tls: false },
          ingestionStartDate: '2026-12-01',
          secret: '',
        },
        yeastarP550,
        true,
        '2026-11-01',
      ),
    ).toEqual({
      host: 'pbxAdmin.errors.host',
      verify_certificate: 'pbxAdmin.errors.verifyWithoutTls',
      ingestionStartDate: 'pbxAdmin.errors.startDate',
    });
  });

  it('flags start-date changes and queue removals for confirmation', () => {
    const input = toConnectorInput(connector, yeastarP550);
    expect(needsConfirmation(impactfulChanges(connector, input))).toBe(false);
    const changed = impactfulChanges(connector, {
      ...input,
      ingestionStartDate: '2026-07-01',
      queueIds: ['q-6001'],
    });
    expect(changed).toEqual({
      startDate: { from: '2026-08-01', to: '2026-07-01' },
      removedQueues: ['q-6002'],
    });
  });

  it('limits manual synchronization ranges', () => {
    expect(
      validateSyncRange({ from: '2026-10-01', to: '2026-10-07' }, '2026-08-01', '2026-11-01'),
    ).toBeNull();
    expect(
      validateSyncRange({ from: '2026-07-01', to: '2026-07-07' }, '2026-08-01', '2026-11-01'),
    ).toBe('beforeStart');
    expect(
      validateSyncRange({ from: '2026-10-01', to: '2026-11-02' }, '2026-08-01', '2026-11-01'),
    ).toBe('future');
    expect(
      validateSyncRange({ from: '2026-08-01', to: '2026-11-01' }, '2026-08-01', '2026-11-01'),
    ).toBe('tooLong');
  });
});
