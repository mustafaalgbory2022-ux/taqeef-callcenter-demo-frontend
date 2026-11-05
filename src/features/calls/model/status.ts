import type { CallStatus } from '@/shared/types/domain';

/** Pipeline steps in order (contract v0.2 item C). The last step is any evaluated status. */
export const PIPELINE_STEPS = [
  'uploaded',
  'probing',
  'ready',
  'transcribing',
  'transcribed',
  'evaluating',
] as const;

export type CallStatusGroup = 'processing' | 'evaluated' | 'failed';

const GROUP: Readonly<Record<CallStatus, CallStatusGroup>> = {
  uploaded: 'processing',
  probing: 'processing',
  ready: 'processing',
  transcribing: 'processing',
  transcribed: 'processing',
  evaluating: 'processing',
  scored: 'evaluated',
  insufficient_evidence: 'evaluated',
  not_assessable: 'evaluated',
  rejected: 'failed',
  transcription_failed: 'failed',
  evaluation_failed: 'failed',
};

export const statusGroup = (s: CallStatus): CallStatusGroup => GROUP[s];

/** Work is still in progress (the UI keeps polling). */
export const isProcessingStatus = (s: CallStatus): boolean => GROUP[s] === 'processing';

/** An evaluation run exists and is shown (scored or an explicit no-score outcome). */
export const isEvaluatedStatus = (s: CallStatus): boolean => GROUP[s] === 'evaluated';

/** Index of the current pipeline step; evaluated = all steps done; failed = -1. */
export function pipelineIndex(s: CallStatus): number {
  if (GROUP[s] === 'evaluated') return PIPELINE_STEPS.length;
  return (PIPELINE_STEPS as readonly string[]).indexOf(s);
}
