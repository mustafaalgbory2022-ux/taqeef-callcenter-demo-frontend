import { useRouteError } from 'react-router';
import { ErrorState } from '@/shared/ui/States';

/** Last-resort boundary for unexpected render errors inside a route. */
export function RouteErrorPage() {
  const error = useRouteError();
  return <ErrorState error={error} onRetry={() => window.location.reload()} />;
}
