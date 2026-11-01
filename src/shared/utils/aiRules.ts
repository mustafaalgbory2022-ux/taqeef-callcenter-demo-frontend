import type { AiLimits, AiPromptKind } from '@/shared/types/domain';

/**
 * AI configuration rules shared by the form validation and the simulated backend.
 * PROVISIONAL until the backend publishes its own limits; the server stays authoritative.
 */
export const PROMPT_PLACEHOLDERS: Readonly<Record<AiPromptKind, readonly string[]>> = {
  evaluation: ['transcript', 'criteria', 'scorecard_version'],
  classification: ['transcript', 'reasons'],
  summary: ['transcript'],
};

/** Optional placeholders any prompt may use. */
export const OPTIONAL_PLACEHOLDERS: readonly string[] = ['dictionary', 'language'];

export const PROMPT_MAX_LENGTH = 8000;

export const LIMIT_RANGES: Readonly<Record<keyof AiLimits, readonly [number, number]>> = {
  maxConcurrentJobs: [1, 8],
  maxAudioMinutes: [1, 180],
  maxQueueLength: [10, 5000],
  retryLimit: [0, 5],
  jobTimeoutMinutes: [5, 240],
};

export const TEMPERATURE_RANGE = [0, 1] as const;
export const CONFIDENCE_RANGE = [0.5, 0.99] as const;

export interface PlaceholderCheck {
  missing: string[];
  unknown: string[];
}

/** Required placeholders that are missing and `{tokens}` that the backend would not fill. */
export function checkPlaceholders(kind: AiPromptKind, text: string): PlaceholderCheck {
  const used = new Set([...text.matchAll(/\{([a-z_]+)\}/gi)].map((m) => m[1] ?? ''));
  const required = PROMPT_PLACEHOLDERS[kind];
  const allowed = new Set([...required, ...OPTIONAL_PLACEHOLDERS]);
  return {
    missing: required.filter((p) => !used.has(p)),
    unknown: [...used].filter((p) => !allowed.has(p)),
  };
}

export const inRange = (n: number, [min, max]: readonly [number, number]) =>
  Number.isFinite(n) && n >= min && n <= max;

export const isWholeInRange = (n: number, range: readonly [number, number]) =>
  Number.isInteger(n) && inRange(n, range);
