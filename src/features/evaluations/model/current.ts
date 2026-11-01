import type { Evaluation } from '@/shared/types/domain';

/** An evaluation counts in dashboards only if it completed with an overall score. */
export function isEligible(e: Evaluation): boolean {
  return e.status === 'completed' && e.overallScore !== null;
}

const newerThan = (a: Evaluation, b: Evaluation) =>
  Date.parse(a.createdAt) > Date.parse(b.createdAt) || (a.createdAt === b.createdAt && a.id > b.id);

/**
 * One evaluation per call: the latest eligible one. Earlier evaluations remain in the
 * immutable history but never count twice.
 */
export function currentEvaluations(evaluations: readonly Evaluation[]): Evaluation[] {
  const byCall = new Map<string, Evaluation>();
  for (const e of evaluations) {
    if (!isEligible(e)) continue;
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
