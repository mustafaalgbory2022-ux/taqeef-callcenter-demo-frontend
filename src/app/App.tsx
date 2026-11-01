import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { AppProviders } from './providers/AppProviders';
import { createAppRouter } from './router';
import { takeLaunchCodeFromUrl } from './session/launchCode';
import { SessionGate } from './session/SessionGate';

export function App() {
  // Order matters: strip the launch code first, then let the router read the clean URL.
  const [launchCode] = useState(takeLaunchCodeFromUrl);
  const [router] = useState(createAppRouter);
  return (
    <AppProviders>
      <SessionGate launchCode={launchCode}>
        <RouterProvider router={router} />
      </SessionGate>
    </AppProviders>
  );
}
