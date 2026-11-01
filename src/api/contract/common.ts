import { z } from 'zod';

export const IdSchema = z.string().min(1);
export const IsoDateTimeSchema = z.iso.datetime({ offset: true });
export const LanguageSchema = z.enum(['ar', 'en']);
export type Language = z.infer<typeof LanguageSchema>;

/** Text shown in both UI languages. */
export const LocalizedTextSchema = z.object({ ar: z.string(), en: z.string() });
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

/** All scores in the system use a 0–10 scale. */
export const SCORE_MIN = 0;
export const SCORE_MAX = 10;
export const ScoreSchema = z.number().min(SCORE_MIN).max(SCORE_MAX);

/** Normalized error shape surfaced to the UI regardless of backend error format. */
export const ApiErrorSchema = z.object({
  status: z.number().int(),
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;
