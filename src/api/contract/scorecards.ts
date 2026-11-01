import { z } from 'zod';
import { IdSchema, IsoDateTimeSchema, LocalizedTextSchema, ScoreSchema } from './common';

export const ScoreAnchorSchema = z.object({
  score: ScoreSchema,
  description: LocalizedTextSchema,
});

export const ScorecardCriterionSchema = z.object({
  id: IdSchema,
  label: LocalizedTextSchema,
  description: LocalizedTextSchema.optional(),
  /** Relative weight; the overall score is the weighted mean of criterion scores. */
  weight: z.number().positive(),
  anchors: z.array(ScoreAnchorSchema).default([]),
});
export type ScorecardCriterion = z.infer<typeof ScorecardCriterionSchema>;

/** Scorecards are immutable once used; edits create a new version. */
export const ScorecardSchema = z.object({
  id: IdSchema,
  version: z.number().int().positive(),
  name: LocalizedTextSchema,
  passThreshold: ScoreSchema,
  criteria: z.array(ScorecardCriterionSchema).min(1),
  createdAt: IsoDateTimeSchema,
});
export type Scorecard = z.infer<typeof ScorecardSchema>;

export const ScorecardListSchema = z.array(ScorecardSchema);
