import { nextId } from './db';
import { uploadTranscriptTemplate } from './fixtures/calls';
import { simulateEvaluation, syntheticUploadJudgments } from './scoring';
import type { MockState, WireCall } from './types';

/** Simulated pipeline timings (ms after upload). The real backend does this work. */
export const STAGE_MS = { transcribing: 1200, scoring: 2800, scored: 4500 } as const;

export function latestScorecard(state: MockState) {
  const latest = state.scorecards.reduce((a, b) => (b.version > a.version ? b : a));
  return latest;
}

/**
 * Scorecard used for automatic evaluation of newly processed calls, following the AI
 * configuration's binding ('latest' or a pinned version). Manual re-scoring uses the latest.
 */
export function automaticScorecard(state: MockState) {
  const cfg = state.ai.configs.at(-1);
  if (cfg?.scorecard_binding === 'pinned') {
    const pinned = state.scorecards.find((v) => v.version === cfg.pinned_scorecard_version);
    if (pinned) return pinned;
  }
  return latestScorecard(state);
}

/** Advance an uploaded call through simulated stages; materialise results when done. */
export function refreshUpload(state: MockState, call: WireCall, now = Date.now()): boolean {
  const uploadedAt = state.uploads[call.id];
  if (uploadedAt === undefined || call.status === 'scored' || call.status === 'failed')
    return false;
  const elapsed = now - uploadedAt;
  const stage: WireCall['status'] =
    elapsed >= STAGE_MS.scored
      ? 'scored'
      : elapsed >= STAGE_MS.scoring
        ? 'scoring'
        : elapsed >= STAGE_MS.transcribing
          ? 'transcribing'
          : 'uploaded';
  if (stage === call.status) return false;

  if (stage === 'scoring' || stage === 'scored') {
    state.transcripts[call.id] ??= { call_id: call.id, segments: uploadTranscriptTemplate };
    call.duration_ms ??= 60_000;
  }
  if (stage === 'scored') {
    const scorecard = automaticScorecard(state);
    const judgments = syntheticUploadJudgments(scorecard);
    state.judgments[call.id] = judgments;
    state.evaluations.push(
      simulateEvaluation({
        id: nextId(state, 'ev'),
        call,
        segments: uploadTranscriptTemplate,
        judgments,
        scorecard,
        trigger: 'initial',
        supersedesId: null,
        createdAt: new Date(now).toISOString(),
      }),
    );
  }
  call.status = stage;
  return true;
}
