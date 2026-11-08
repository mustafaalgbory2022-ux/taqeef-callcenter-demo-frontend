// @vitest-environment node
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { build } from 'vite';

/**
 * Regression guard: the live build must contain no simulated backend and no synthetic data.
 * A mock build is produced too, so the markers are proven meaningful.
 */
const MOCK_MARKERS = ['taqeef.mock.db', 'Synthetic administrator', 'agt-001', 'DEMO-001'];
const MOCK_SOURCE = /[\\/]src[\\/]shared[\\/]api[\\/](mock[\\/]|runtime[\\/]mock\.ts)/;

interface Output {
  js: string;
  sources: string[];
}

async function buildFor(mode: 'live' | 'mock'): Promise<Output> {
  const outDir = mkdtempSync(join(tmpdir(), `taqeef-demo-${mode}-`));
  const previous = process.env.VITE_API_MODE;
  process.env.VITE_API_MODE = mode;
  try {
    await build({
      configFile: 'vite.config.ts',
      mode: 'production',
      logLevel: 'silent',
      build: { outDir, emptyOutDir: true },
    });
  } finally {
    if (previous === undefined) delete process.env.VITE_API_MODE;
    else process.env.VITE_API_MODE = previous;
  }
  const assets = join(outDir, 'assets');
  const files = readdirSync(assets);
  const js = files
    .filter((f) => f.endsWith('.js'))
    .map((f) => readFileSync(join(assets, f), 'utf8'))
    .join('\n');
  const sources = files
    .filter((f) => f.endsWith('.js.map'))
    .flatMap(
      (f) => (JSON.parse(readFileSync(join(assets, f), 'utf8')) as { sources: string[] }).sources,
    );
  rmSync(outDir, { recursive: true, force: true });
  return { js, sources };
}

describe('production bundles', () => {
  let live: Output;
  let mock: Output;

  beforeAll(async () => {
    live = await buildFor('live');
    mock = await buildFor('mock');
  }, 120_000);

  it('live build contains no simulated-backend module', () => {
    expect(live.sources.length).toBeGreaterThan(0);
    expect(live.sources.filter((s) => MOCK_SOURCE.test(s))).toEqual([]);
  });

  it('live build contains no synthetic data', () => {
    expect(MOCK_MARKERS.filter((m) => live.js.includes(m))).toEqual([]);
  });

  it('mock build still includes the simulated backend (markers are meaningful)', () => {
    expect(mock.sources.some((s) => MOCK_SOURCE.test(s))).toBe(true);
    expect(MOCK_MARKERS.filter((m) => !mock.js.includes(m))).toEqual([]);
  });
});
