import type { Evaluation } from '@/shared/types/domain';

/** Counts in scored averages and low-score counts. */
export function isScored(e: Evaluation): boolean {
  return e.outcome === 'scored' && e.displayHundredths !== null;
}

const newerThan = (a: Evaluation, b: Evaluation) =>
  Date.parse(a.createdAt) > Date.parse(b.createdAt) || (a.createdAt === b.createdAt && a.id > b.id);

/**
 * One evaluation per call: the latest run (a failed evaluation creates no run, contract 3.1;
 * the run may still have no score, see isScored). Earlier evaluations remain
 * in the immutable history but never count twice, and an insufficient-evidence result is
 * never replaced by an older score.
 */
export function currentEvaluations(evaluations: readonly Evaluation[]): Evaluation[] {
  const byCall = new Map<string, Evaluation>();
  for (const e of evaluations) {
    const prev = byCall.get(e.callId);
    if (!prev || newerThan(e, prev)) byCall.set(e.callId, e);
  }
  return [...byCall.values()];
}

/** All evaluations of each call, newest first. */
export function historyByCall(evaluations: readonly Evaluation[]): Map<string, Evaluation[]> {
  const map = new Map<string, Evaluation[]>();
  for (const e of evaluations) map.set(e.callId, [...(map.get(e.callId) ?? []), e]);
  for (const list of map.values()) list.sort((a, b) => (newerThan(a, b) ? -1 : 1));
  return map;
}
