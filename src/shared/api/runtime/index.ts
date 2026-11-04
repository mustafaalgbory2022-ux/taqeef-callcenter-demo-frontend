/**
 * Default (mock) resolution of `@/shared/api/runtime`, used by type-checking, unit tests and
 * mock builds. Live builds alias this module to ./live.ts in vite.config.ts, so nothing below
 * is bundled. Always import the runtime through `@/shared/api/runtime`, never ./mock directly.
 */
export { runtime } from './mock';
export type { ApiRuntime, DemoTools } from './types';
