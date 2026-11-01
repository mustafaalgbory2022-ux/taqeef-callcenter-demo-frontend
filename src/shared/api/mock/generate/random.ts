/** Deterministic helpers for SYNTHETIC data generation (same data on every load). */

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** mulberry32 PRNG: returns floats in [0, 1). */
export function prng(seed: number | string): () => number {
  let a = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(rand: () => number, items: readonly T[]): T =>
  items[Math.floor(rand() * items.length)] as T;

export function weighted<T>(rand: () => number, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  let last: T | undefined;
  for (const [value, w] of entries) {
    last = value;
    r -= w;
    if (r <= 0) return value;
  }
  if (last === undefined) throw new Error('weighted() needs at least one entry');
  return last;
}

/** Synthetic history window (fixed so data is stable). */
export const DATA_START = '2026-08-01';
export const DATA_END = '2026-10-31';

export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

/** 0 = Sunday … 5 = Friday (Iraqi weekend), 6 = Saturday. */
export const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

export const maskedNumber = (rand: () => number) =>
  `•••• ${String(Math.floor(rand() * 10000)).padStart(4, '0')}`;
