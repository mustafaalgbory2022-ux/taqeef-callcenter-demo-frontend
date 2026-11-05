/**
 * SYNTHETIC identifiers in the confirmed formats: transcript revisions are lowercase UUIDv7
 * and segment ids are `seg-NNNN`. The values are invented and carry no real timestamp.
 */
export function syntheticRevisionId(n: number): string {
  return `0193a000-0000-7000-8000-${n.toString(16).padStart(12, '0')}`;
}

export function syntheticSegmentId(n: number): string {
  return `seg-${String(n).padStart(4, '0')}`;
}
