import { createFetchTransport } from '../transport';
import type { ApiRuntime } from './types';

/** Live runtime: same-origin FastAPI over fetch. Must never import ../mock. */
export const runtime: ApiRuntime = {
  mode: 'live',
  createTransport: createFetchTransport,
  demoTools: null,
};
