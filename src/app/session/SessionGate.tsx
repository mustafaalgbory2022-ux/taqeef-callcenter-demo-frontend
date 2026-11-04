import type { ReactNode } from 'react';
import { useApiContext } from '@/shared/api/ApiProvider';
import { BrandingProvider } from '@/shared/branding/BrandingProvider';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { SessionContext } from '@/shared/hooks/useSession';
import { LoadingState } from '@/shared/ui/States';
import { LaunchScreen } from './LaunchScreen';
import { OrganizationDefaults } from './OrganizationDefaults';

/**
 * The demo opens through a one-time launch-code exchange ("Open local demo session").
 * This is not a login form: production password + TOTP sign-in is a backend requirement
 * (see docs/handoff.md). After the session opens, organization defaults are applied.
 */
export function SessionGate({
  launchCode,
  children,
}: {
  launchCode: string | null;
  children: ReactNode;
}) {
  const { store } = useApiContext();
  const session = useApiQuery(['session'], (api) => api.getSession());
  if (session.status === 'loading') return <LoadingState rows={3} />;
  if (session.status === 'success' && session.data) {
    return (
      <SessionContext.Provider value={session.data}>
        <OrganizationDefaults />
        <BrandingProvider enabled>{children}</BrandingProvider>
      </SessionContext.Provider>
    );
  }
  return (
    <BrandingProvider enabled={false}>
      <LaunchScreen
        initialCode={launchCode}
        loadError={session.status === 'error' ? session.error : undefined}
        onOpened={() => store.invalidate('session')}
      />
    </BrandingProvider>
  );
}
