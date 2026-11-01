import type { MessageKey } from '@/shared/i18n/translate';
import type { DateRange, PbxConnector, PbxConnectorInput, Queue } from '@/shared/types/domain';
import { daysInRange, ISO_DATE } from '@/shared/utils/dates';
import { INGESTION_MIN_DATE, MAX_SYNC_DAYS, POLL_RANGE } from '@/shared/utils/pbxRules';
import type { PbxVendorFormAdapter } from '../vendors';

export type ConnectorErrors = Partial<Record<string, MessageKey>>;

export function toConnectorInput(
  c: PbxConnector,
  adapter: PbxVendorFormAdapter,
): PbxConnectorInput {
  return {
    name: c.name,
    settings: { ...adapter.defaults, ...c.settings },
    queueIds: c.queueIds,
    ingestionStartDate: c.ingestionStartDate,
    pollIntervalMinutes: c.pollIntervalMinutes,
    secret: '',
  };
}

/** Generic connector rules + the vendor adapter's own settings validation. */
export function validateConnector(
  input: PbxConnectorInput,
  adapter: PbxVendorFormAdapter,
  credentialSet: boolean,
  today: string,
): ConnectorErrors {
  const errors: ConnectorErrors = { ...adapter.validate(input.settings) };
  if (!input.name.trim() || input.name.trim().length > 60) errors.name = 'pbxAdmin.errors.name';
  if (input.queueIds.length === 0) errors.queueIds = 'pbxAdmin.errors.queues';
  const d = input.ingestionStartDate;
  if (!ISO_DATE.test(d) || d < INGESTION_MIN_DATE || d > today)
    errors.ingestionStartDate = 'pbxAdmin.errors.startDate';
  const p = input.pollIntervalMinutes;
  if (!Number.isInteger(p) || p < POLL_RANGE[0] || p > POLL_RANGE[1])
    errors.pollIntervalMinutes = 'pbxAdmin.errors.poll';
  if (input.secret && (input.secret.length < 8 || input.secret.length > 256))
    errors.secret = 'pbxAdmin.errors.secret';
  if (!credentialSet && !input.secret) errors.secret = 'pbxAdmin.errors.secretRequired';
  return errors;
}

export interface ImpactfulChanges {
  startDate: { from: string; to: string } | null;
  removedQueues: string[];
}

/** Changes that alter what is ingested and therefore need explicit confirmation. */
export function impactfulChanges(c: PbxConnector, input: PbxConnectorInput): ImpactfulChanges {
  return {
    startDate:
      input.ingestionStartDate !== c.ingestionStartDate
        ? { from: c.ingestionStartDate, to: input.ingestionStartDate }
        : null,
    removedQueues: c.queueIds.filter((id) => !input.queueIds.includes(id)),
  };
}

export const needsConfirmation = (i: ImpactfulChanges) =>
  i.startDate !== null || i.removedQueues.length > 0;

export type SyncRangeError = 'invalid' | 'beforeStart' | 'future' | 'tooLong';

export function validateSyncRange(
  range: DateRange,
  startDate: string,
  today: string,
): SyncRangeError | null {
  if (!ISO_DATE.test(range.from) || !ISO_DATE.test(range.to) || range.from > range.to)
    return 'invalid';
  if (range.from < startDate) return 'beforeStart';
  if (range.to > today) return 'future';
  if (daysInRange(range) > MAX_SYNC_DAYS) return 'tooLong';
  return null;
}

/** Queues selectable for ingestion: active ones plus any already tracked. */
export const ingestibleQueues = (queues: readonly Queue[], tracked: readonly string[]) =>
  queues.filter((q) => q.status !== 'disabled' || tracked.includes(q.id));
