import { z } from 'zod';

/**
 * Runtime configuration, validated once at startup.
 * `mock`    — synthetic data served in-browser (MSW, added once versions are confirmed).
 * `fastapi` — real HTTP calls to the local Taqeef FastAPI backend.
 */
const EnvSchema = z.object({
  VITE_API_MODE: z.enum(['mock', 'fastapi']).default('mock'),
  VITE_API_BASE_URL: z.string().min(1).default('/api'),
});

export type ApiMode = z.infer<typeof EnvSchema>['VITE_API_MODE'];

export const env = EnvSchema.parse(import.meta.env);
