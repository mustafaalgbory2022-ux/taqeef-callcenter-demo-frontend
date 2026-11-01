import { z } from 'zod';
import { IdSchema, IsoDateTimeSchema, LanguageSchema } from './common';

export const CallStatusSchema = z.enum([
  'uploaded',
  'transcribing',
  'transcribed',
  'scoring',
  'scored',
  'failed',
]);
export type CallStatus = z.infer<typeof CallStatusSchema>;

export const CallSchema = z.object({
  id: IdSchema,
  title: z.string(),
  agentAlias: z.string(),
  queue: z.string(),
  direction: z.enum(['inbound', 'outbound']),
  language: z.union([LanguageSchema, z.literal('mixed')]),
  durationMs: z.number().int().nonnegative(),
  recordedAt: IsoDateTimeSchema,
  status: CallStatusSchema,
  audioUrl: z.string().nullable(),
  /** True for demo fixtures. The UI must label synthetic content. */
  synthetic: z.boolean(),
});
export type Call = z.infer<typeof CallSchema>;

export const CallListSchema = z.array(CallSchema);

export const TranscriptSegmentSchema = z.object({
  id: IdSchema,
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  speaker: z.enum(['agent', 'customer', 'system']),
  language: LanguageSchema,
  text: z.string(),
});
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;

export const TranscriptSchema = z.object({
  callId: IdSchema,
  segments: z.array(TranscriptSegmentSchema),
});
export type Transcript = z.infer<typeof TranscriptSchema>;
