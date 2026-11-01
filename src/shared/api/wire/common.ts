import { object, str } from '../decode';

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
