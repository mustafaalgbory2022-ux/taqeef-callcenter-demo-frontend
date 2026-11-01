import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createApiClient, type ApiClient } from './client';
import { apiMode } from './config';
import { createMockTransport } from './mock/server';
import { QueryStore } from './queryStore';
import { createFetchTransport } from './transport';

interface ApiContextValue {
  client: ApiClient;
  store: QueryStore;
}

const ApiContext = createContext<ApiContextValue | null>(null);

export function createDefaultClient(): ApiClient {
  return apiMode === 'live'
    ? createApiClient(createFetchTransport(), 'live')
    : createApiClient(createMockTransport(), 'mock');
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
