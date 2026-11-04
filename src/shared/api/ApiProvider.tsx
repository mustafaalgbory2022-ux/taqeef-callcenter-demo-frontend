import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createApiClient, type ApiClient } from './client';
import { QueryStore } from './queryStore';
import { runtime } from '@/shared/api/runtime';

interface ApiContextValue {
  client: ApiClient;
  store: QueryStore;
}

const ApiContext = createContext<ApiContextValue | null>(null);

/** Client for the build's runtime (mock or live, chosen at build time). */
export function createDefaultClient(): ApiClient {
  return createApiClient(runtime.createTransport(), runtime.mode);
}

export function ApiProvider({ client, children }: { client?: ApiClient; children: ReactNode }) {
  const value = useMemo(
    () => ({ client: client ?? createDefaultClient(), store: new QueryStore() }),
    [client],
  );
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApiContext(): ApiContextValue {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApiContext must be used inside <ApiProvider>');
  return ctx;
}

export function useApiClient(): ApiClient {
  return useApiContext().client;
}
