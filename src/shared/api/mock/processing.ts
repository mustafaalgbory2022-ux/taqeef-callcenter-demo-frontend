import { nextId } from './db';
import { syntheticRevisionId } from './ids';
import { uploadTranscriptTemplate } from './fixtures/calls';
import { simulateEvaluation, syntheticUploadJudgments } from './scoring';
import type { MockState, WireCall, WireEvaluation } from './types';

/** Simulated pipeline timings (ms after upload). The real backend does this work. */
export const STAGE_MS = {
  probing: 500,
  ready: 1000,
  transcribing: 1500,
  transcribed: 2400,
  evaluating: 3000,
  evaluated: 4500,
} as const;

type Stage = keyof typeof STAGE_MS | 'uploaded';
const STAGE_ORDER: Stage[] = [
  'uploaded',
  'probing',
  'ready',
  'transcribing',
  'transcribed',
  'evaluating',
  'evaluated',
];

/** Call status that reflects a run's explicit outcome (contract v0.2 item C). */
export function statusForOutcome(outcome: WireEvaluation['outcome']): WireCall['status'] {
  return outcome;
}

export function latestScorecard(state: MockState) {
  const latest = state.scorecards.reduce((a, b) => (b.version > a.version ? b : a));
  return latest;
}

function stageAt(elapsed: number): Stage {
  let stage: Stage = 'uploaded';
  for (const s of STAGE_ORDER) if (s === 'uploaded' || elapsed >= STAGE_MS[s]) stage = s;
  return stage;
}

/** Advance an uploaded call through simulated stages; materialise results when done. */
export function refreshUpload(state: MockState, call: WireCall, now = Date.now()): boolean {
  const uploadedAt = state.uploads[call.id];
  const current = STAGE_ORDER.indexOf(call.status as Stage);
  if (uploadedAt === undefined || current < 0) return false;
  const stage = stageAt(now - uploadedAt);
  if (STAGE_ORDER.indexOf(stage) <= current) return false;

  if (STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf('transcribed')) {
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
  if (stage === 'evaluated') {
    const scorecard = latestScorecard(state);
    const judgments = syntheticUploadJudgments(scorecard);
    state.judgments[call.id] = judgments;
    const run = simulateEvaluation({
      id: nextId(state, 'ev'),
      call,
      segments: uploadTranscriptTemplate,
      transcriptRevisionId: call.current_transcript_revision_id ?? '',
      judgments,
      scorecard,
      trigger: 'initial',
      supersedesId: null,
      createdAt: new Date(now).toISOString(),
    });
    state.evaluations.push(run);
    call.status = statusForOutcome(run.outcome);
    return true;
  }
  call.status = stage;
  return true;
}
