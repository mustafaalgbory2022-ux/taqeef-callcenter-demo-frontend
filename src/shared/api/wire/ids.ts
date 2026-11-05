import { DecodeError, str, type Decoder } from '../decode';

/**
 * Identifiers are opaque strings (contract v0.2.1 §C, CONFIRMED). The frontend never parses
 * them or checks a UUID version; it only rejects empty or oversized values. (The contract
 * allows at most a 36-character-form check; none is needed here.)
 */
export const opaqueId: Decoder<string> = (value, path = '') => {
  const s = str(value, path);
  if (s.length === 0 || s.length > 128) throw new DecodeError(path, 'a non-empty opaque id');
  return s;
};

export const revisionId = opaqueId;
/** Segment ids are opaque within their revision; the mock uses the `seg-NNNN` form. */
export const segmentId = opaqueId;
