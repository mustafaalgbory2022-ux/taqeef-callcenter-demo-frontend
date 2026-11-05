import { DecodeError, object, str, type Decoder } from '../decode';

export const localizedText = object({ ar: str, en: str });

/**
 * Wire time unit. PROVISIONAL: the backend has not confirmed timestamp units.
 * If it sends seconds, change this one constant and every mapper follows.
 */
export const WIRE_TIME_UNIT: 'ms' | 's' = 'ms';

export function wireTimeToMs(value: number): number {
  return WIRE_TIME_UNIT === 's' ? Math.round(value * 1000) : value;
}

export function msToWireTime(ms: number): number {
  return WIRE_TIME_UNIT === 's' ? ms / 1000 : ms;
}

/**
 * Timestamps are UTC ISO 8601 with milliseconds and `Z`, e.g. `2026-11-05T09:30:00.000Z`
 * (contract v0.2 item 4, CONFIRMED). Any other form is a contract mismatch. Conversion to the
 * browser's local zone happens only when formatting for display.
 */
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const utcTimestamp: Decoder<string> = (value, path = '') => {
  const s = str(value, path);
  if (!UTC_TIMESTAMP.test(s) || Number.isNaN(Date.parse(s))) {
    throw new DecodeError(path, 'a UTC timestamp like 2026-11-05T09:30:00.000Z');
  }
  return s;
};
