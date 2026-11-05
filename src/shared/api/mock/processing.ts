import { nextId } from './db';
import { syntheticRevisionId } from './ids';
import { uploadTranscriptTemplate } from './fixtures/calls';
import { simulateEvaluation, syntheticUploadJudgments } from './scoring';
import type { MockState, WireCall } from './types';

/** Simulated pipeline timings (ms after upload). The real backend does this work. */
export const STAGE_MS = { transcribing: 1200, scoring: 2800, scored: 4500 } as const;

export function latestScorecard(state: MockState) {
  const latest = state.scorecards.reduce((a, b) => (b.version > a.version ? b : a));
  return latest;
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
    if (!state.transcripts[call.id]) {
      state.seq += 1;
      state.transcripts[call.id] = {
        call_id: call.id,
        transcript_revision_id: syntheticRevisionId(state.seq),
        revision_no: 0,
        segments: uploadTranscriptTemplate,
      };
    }
    call.current_transcript_revision_id =
      state.transcripts[call.id]?.transcript_revision_id ?? null;
    call.duration_ms ??= 60_000;
  }
  if (stage === 'scored') {
    const scorecard = latestScorecard(state);
    const judgments = syntheticUploadJudgments(scorecard);
    state.judgments[call.id] = judgments;
    state.evaluations.push(
      simulateEvaluation({
        id: nextId(state, 'ev'),
        call,
        segments: uploadTranscriptTemplate,
        transcriptRevisionId: call.current_transcript_revision_id ?? '',
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
