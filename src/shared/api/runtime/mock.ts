import { createMockTransport, issueSyntheticLaunchCode, resetMockData } from '../mock/server';
import type { ApiRuntime } from './types';

/** Mock runtime: simulated backend with synthetic data (development and demonstrations). */
export const runtime: ApiRuntime = {
  mode: 'mock',
  createTransport: () => createMockTransport(),
  demoTools: { issueLaunchCode: issueSyntheticLaunchCode, resetData: resetMockData },
};
