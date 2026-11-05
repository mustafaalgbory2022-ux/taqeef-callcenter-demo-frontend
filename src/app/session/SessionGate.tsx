import { useEffect, useState, type ReactNode } from 'react';
import { useApiContext } from '@/shared/api/ApiProvider';
import { BrandingProvider } from '@/shared/branding/BrandingProvider';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { SessionContext } from '@/shared/hooks/useSession';
import { LoadingState } from '@/shared/ui/States';
import { LaunchScreen } from './LaunchScreen';

/**
 * The demo opens through a one-time launch-code exchange ("Open local demo session").
 * This is not a login form. When the backend ends the session (any 401), all cached data is
 * dropped and the launch screen says so; there is no silent re-exchange (contract 1.6).
 */
export function SessionGate({
  launchCode,
  children,
}: {
  launchCode: string | null;
  children: ReactNode;
}) {
  const { client, store } = useApiContext();
  const [ended, setEnded] = useState(false);
  useEffect(
    () =>
      client.onSessionEnded(() => {
        setEnded(true);
        store.clear();
        store.invalidate('session');
      }),
    [client, store],
  );
  const session = useApiQuery(['session'], (api) => api.getSession());
  if (session.status === 'loading') return <LoadingState rows={3} />;
  if (session.status === 'success' && session.data) {
    return (
      <SessionContext.Provider value={session.data}>
        <BrandingProvider enabled>{children}</BrandingProvider>
      </SessionContext.Provider>
    );
  }
  return (
    <BrandingProvider enabled={false}>
      <LaunchScreen
        initialCode={ended ? null : launchCode}
        loadError={session.status === 'error' ? session.error : undefined}
        sessionEnded={ended}
        onOpened={() => {
          setEnded(false);
          store.invalidate('session');
        }}
      />
    </BrandingProvider>
  );
}
