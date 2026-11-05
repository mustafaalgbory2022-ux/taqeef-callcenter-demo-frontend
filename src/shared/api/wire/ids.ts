import { DecodeError, str, type Decoder } from '../decode';

/**
 * Identifiers are opaque strings (contract v0.2 item 10): the frontend never parses them or
 * depends on their format, and only rejects empty values. The contract describes them as
 * lowercase UUIDv7; that format is not enforced here until confirmed for every id.
 */
export const opaqueId: Decoder<string> = (value, path = '') => {
  const s = str(value, path);
  if (s.length === 0 || s.length > 128) throw new DecodeError(path, 'a non-empty opaque id');
  return s;
};

export const revisionId = opaqueId;

/** `seg-0001` … `seg-9999`, unique within one transcript revision (contract v0.1 2.2, CONFIRMED). */
const SEGMENT_ID = /^seg-\d{4}$/;

export const segmentId: Decoder<string> = (value, path = '') => {
  const s = str(value, path);
  if (!SEGMENT_ID.test(s)) throw new DecodeError(path, 'a segment id like "seg-0001"');
  return s;
};
