import { createMockBackend, issueSyntheticLaunchCode, resetMockData } from '../mock/server';
import type { ApiRuntime } from './types';

/** Mock runtime: simulated backend with synthetic data (development and demonstrations). */
export const runtime: ApiRuntime = {
  mode: 'mock',
  createBackend: () => createMockBackend(),
  demoTools: { issueLaunchCode: issueSyntheticLaunchCode, resetData: resetMockData },
};
