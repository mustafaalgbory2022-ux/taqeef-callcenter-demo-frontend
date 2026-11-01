import type { ReactNode } from 'react';
import { ApiProvider } from '@/shared/api/ApiProvider';
import type { ApiClient } from '@/shared/api/client';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { ToastProvider } from '@/shared/ui/Toaster';

/** Cross-cutting providers. `client` can be injected for tests. */
export function AppProviders({ children, client }: { children: ReactNode; client?: ApiClient }) {
  return (
    <I18nProvider>
      <ThemeProvider>
        <ApiProvider {...(client ? { client } : {})}>
          <ToastProvider>{children}</ToastProvider>
        </ApiProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
