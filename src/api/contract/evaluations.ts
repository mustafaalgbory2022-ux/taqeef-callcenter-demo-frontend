import { z } from 'zod';
import { IdSchema, IsoDateTimeSchema, ScoreSchema } from './common';

export const EvidenceSchema = z.object({
  segmentId: IdSchema,
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  quote: z.string(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const CriterionScoreSchema = z.object({
  criterionId: IdSchema,
  score: ScoreSchema,
  rationale: z.string(),
  evidence: z.array(EvidenceSchema),
});
export type CriterionScore = z.infer<typeof CriterionScoreSchema>;

/** Each scoring run is a new evaluation; re-scores reference the one they supersede. */
export const EvaluationSchema = z.object({
  id: IdSchema,
  callId: IdSchema,
  scorecardId: IdSchema,
  scorecardVersion: z.number().int().positive(),
  overallScore: ScoreSchema,
  scores: z.array(CriterionScoreSchema),
  source: z.enum(['ai', 'manual']),
  supersedesId: IdSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});
export type Evaluation = z.infer<typeof EvaluationSchema>;

export const EvaluationListSchema = z.array(EvaluationSchema);

export const RescoreRequestSchema = z.object({
  scorecardId: IdSchema,
  scorecardVersion: z.number().int().positive().optional(),
});
export type RescoreRequest = z.infer<typeof RescoreRequestSchema>;
