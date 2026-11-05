import type { ApiMode } from '../config';
import type { Transport } from '../transport';

export interface Backend {
  transport: Transport;
  /** Mock only: in-browser synthetic audio; live builds use the protected audio route. */
  audioSrc?: (callId: string) => string | null;
}

/** Tools that only exist for the simulated backend (demo launch codes, data reset). */
export interface DemoTools {
  issueLaunchCode(): string;
  resetData(): void;
}

/**
 * The data source the app runs against, selected at BUILD time (vite.config.ts):
 * `@/shared/api/runtime` resolves to `live.ts` when VITE_API_MODE=live, so the simulated
 * backend and its synthetic datasets are not part of the live module graph at all.
 */
export interface ApiRuntime {
  mode: ApiMode;
  createBackend(): Backend;
  /** null in live builds. */
  demoTools: DemoTools | null;
}
