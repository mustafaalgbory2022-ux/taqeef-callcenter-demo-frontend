/**
 * Tiny runtime decoders for API responses (no external validation library, so the local
 * offline build needs nothing extra). Unknown fields are ignored for forward compatibility.
 */

export class DecodeError extends Error {
  constructor(
    readonly path: string,
    readonly expected: string,
  ) {
    super(`Invalid API data at ${path || '<root>'}: expected ${expected}`);
    this.name = 'DecodeError';
  }
}

export type Decoder<T> = (input: unknown, path?: string) => T;
export type Decoded<D> = D extends Decoder<infer T> ? T : never;

export const str: Decoder<string> = (v, path = '') => {
  if (typeof v !== 'string') throw new DecodeError(path, 'string');
  return v;
};

export const num: Decoder<number> = (v, path = '') => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new DecodeError(path, 'number');
  return v;
};

export const bool: Decoder<boolean> = (v, path = '') => {
  if (typeof v !== 'boolean') throw new DecodeError(path, 'boolean');
  return v;
};

/** Number within an inclusive range (e.g. scores 0–10). */
export function numInRange(min: number, max: number): Decoder<number> {
  return (v, path = '') => {
    const n = num(v, path);
    if (n < min || n > max) throw new DecodeError(path, `number ${min}–${max}`);
    return n;
  };
}

export function oneOf<const T extends readonly string[]>(values: T): Decoder<T[number]> {
  return (v, path = '') => {
    if (typeof v !== 'string' || !values.includes(v)) {
      throw new DecodeError(path, values.join(' | '));
    }
    return v;
  };
}

export function nullable<T>(decoder: Decoder<T>): Decoder<T | null> {
  return (v, path = '') => (v === null || v === undefined ? null : decoder(v, path));
}

export function arrayOf<T>(decoder: Decoder<T>): Decoder<T[]> {
  return (v, path = '') => {
    if (!Array.isArray(v)) throw new DecodeError(path, 'array');
    return v.map((item, i) => decoder(item, `${path}[${i}]`));
  };
}

type Shape = Record<string, Decoder<unknown>>;

export function object<S extends Shape>(shape: S): Decoder<{ [K in keyof S]: Decoded<S[K]> }> {
  return (v, path = '') => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
      throw new DecodeError(path, 'object');
    }
    const record = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(shape)) {
      const decoder = shape[key] as Decoder<unknown>;
      out[key] = decoder(record[key], path ? `${path}.${key}` : key);
    }
    return out as { [K in keyof S]: Decoded<S[K]> };
  };
}
