import { DecodeError, str, type Decoder } from '../decode';

/** Lowercase UUIDv7 (contract 2.1, CONFIRMED). */
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
/** `seg-0001` … `seg-9999`, unique within one transcript revision (contract 2.2, CONFIRMED). */
const SEGMENT_ID = /^seg-\d{4}$/;

const pattern =
  (re: RegExp, expected: string): Decoder<string> =>
  (value, path = '') => {
    const s = str(value, path);
    if (!re.test(s)) throw new DecodeError(path, expected);
    return s;
  };

export const revisionId = pattern(UUID_V7, 'a lowercase UUIDv7 transcript revision id');
export const segmentId = pattern(SEGMENT_ID, 'a segment id like "seg-0001"');
