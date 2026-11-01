/** PBX connector rules shared by the forms and the simulated backend (PROVISIONAL). */

/** Hostname (RFC 1123 labels) or dotted IPv4. Never a URL with scheme or path. */
export const HOST_PATTERN =
  /^(?=.{1,253}$)(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*)$/i;

export const PORT_RANGE = [1, 65535] as const;
export const POLL_RANGE = [1, 60] as const;
/** Earliest ingestion start date accepted. */
export const INGESTION_MIN_DATE = '2020-01-01';
/** Longest manual synchronization window (days). */
export const MAX_SYNC_DAYS = 92;

export const isHost = (v: string) => HOST_PATTERN.test(v.trim());
