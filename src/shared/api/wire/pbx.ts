import type {
  PbxConnector,
  PbxConnectorInput,
  PbxSettings,
  PbxSyncRun,
  PbxTestResult,
  PbxVendorInfo,
} from '@/shared/types/domain';
import {
  arrayOf,
  bool,
  DecodeError,
  nullable,
  num,
  object,
  oneOf,
  str,
  type Decoded,
  type Decoder,
} from '../decode';

/* PROVISIONAL wire shapes for PBX connectors (vendor-neutral; settings are vendor-specific). */

const CAPABILITIES = ['cdr', 'recordings', 'queue_statistics', 'live_events'] as const;

/** Flat map of primitive, non-secret vendor settings. */
const settings: Decoder<PbxSettings> = (v, path = '') => {
  if (typeof v !== 'object' || v === null || Array.isArray(v))
    throw new DecodeError(path, 'object');
  const out: Record<string, string | number | boolean> = {};
  for (const [k, x] of Object.entries(v)) {
    if (typeof x !== 'string' && typeof x !== 'number' && typeof x !== 'boolean')
      throw new DecodeError(`${path}.${k}`, 'string | number | boolean');
    out[k] = x;
  }
  return out;
};

export const wirePbxVendor = object({
  id: str,
  name: str,
  status: oneOf(['supported', 'planned']),
  capabilities: arrayOf(oneOf(CAPABILITIES)),
});

export const vendorFromWire = (w: Decoded<typeof wirePbxVendor>): PbxVendorInfo => ({ ...w });

export const wirePbxSync = object({
  id: str,
  connector_id: str,
  trigger: oneOf(['manual', 'scheduled']),
  status: oneOf(['running', 'completed', 'failed', 'simulated']),
  from: str,
  to: str,
  started_at: str,
  finished_at: nullable(str),
  cdr_records: num,
  recordings: num,
  queue_stat_days: num,
  message: str,
  started_by: str,
});

export function syncFromWire(w: Decoded<typeof wirePbxSync>): PbxSyncRun {
  return {
    id: w.id,
    connectorId: w.connector_id,
    trigger: w.trigger,
    status: w.status,
    from: w.from,
    to: w.to,
    startedAt: w.started_at,
    finishedAt: w.finished_at,
    cdrRecords: w.cdr_records,
    recordings: w.recordings,
    queueStatDays: w.queue_stat_days,
    message: w.message,
    startedBy: w.started_by,
  };
}

export const wirePbxConnector = object({
  id: str,
  vendor: str,
  name: str,
  settings,
  credential_set: bool,
  credential_updated_at: nullable(str),
  queue_ids: arrayOf(str),
  ingestion_start_date: str,
  poll_interval_minutes: num,
  enabled: bool,
  state: oneOf(['not_configured', 'configured', 'connected', 'error', 'disabled']),
  state_message: str,
  checked_at: nullable(str),
  last_sync: nullable(wirePbxSync),
  updated_at: str,
  simulated: bool,
});

export function connectorFromWire(w: Decoded<typeof wirePbxConnector>): PbxConnector {
  return {
    id: w.id,
    vendor: w.vendor,
    name: w.name,
    settings: w.settings,
    credentialSet: w.credential_set,
    credentialUpdatedAt: w.credential_updated_at,
    queueIds: w.queue_ids,
    ingestionStartDate: w.ingestion_start_date,
    pollIntervalMinutes: w.poll_interval_minutes,
    enabled: w.enabled,
    state: w.state,
    stateMessage: w.state_message,
    checkedAt: w.checked_at,
    lastSync: w.last_sync ? syncFromWire(w.last_sync) : null,
    updatedAt: w.updated_at,
    simulated: w.simulated,
  };
}

export function connectorInputToWire(
  i: PbxConnectorInput,
  confirm: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: i.name.trim(),
    settings: { ...i.settings },
    queue_ids: [...i.queueIds],
    ingestion_start_date: i.ingestionStartDate,
    poll_interval_minutes: i.pollIntervalMinutes,
    confirm,
  };
  // The secret is write-only: only sent when replaced, never read back.
  if (i.secret) body.secret = i.secret;
  return body;
}

export const wirePbxTest = object({
  ok: bool,
  simulated: bool,
  checked_at: str,
  steps: arrayOf(
    object({
      step: oneOf(['settings', 'credentials', 'network', 'queues']),
      result: oneOf(['passed', 'failed', 'skipped']),
      message: str,
    }),
  ),
});

export const testFromWire = (w: Decoded<typeof wirePbxTest>): PbxTestResult => ({
  ok: w.ok,
  simulated: w.simulated,
  checkedAt: w.checked_at,
  steps: w.steps,
});
