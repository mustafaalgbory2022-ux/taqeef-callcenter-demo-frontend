import { createFetchTransport } from '../transport';
import type { ApiRuntime } from './types';

/** Live runtime: same-origin backend over fetch. Must never import ../mock. */
export const runtime: ApiRuntime = {
  mode: 'live',
  createBackend: () => ({ transport: createFetchTransport() }),
  demoTools: null,
};
