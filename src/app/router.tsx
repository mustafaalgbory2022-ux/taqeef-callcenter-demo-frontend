import { lazy, type ComponentType } from 'react';
import { createBrowserRouter, createHashRouter, type RouteObject } from 'react-router';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteErrorPage } from './pages/RouteErrorPage';
import { AppShell } from './shell/AppShell';

/** Route-level code splitting: each page is its own chunk. */
function page<M>(load: () => Promise<M>, pick: (m: M) => ComponentType) {
  const Page = lazy(async () => ({ default: pick(await load()) }));
  return <Page />;
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: page(
          () => import('@/features/dashboard/pages/OverviewPage'),
          (m) => m.OverviewPage,
        ),
      },
      {
        path: 'live',
        element: page(
          () => import('@/features/live/pages/LivePage'),
          (m) => m.LivePage,
        ),
      },
      {
        path: 'agents',
        element: page(
          () => import('@/features/dashboard/pages/AgentsComparePage'),
          (m) => m.AgentsComparePage,
        ),
      },
      {
        path: 'insights',
        element: page(
          () => import('@/features/insights/pages/InsightsPage'),
          (m) => m.InsightsPage,
        ),
      },
      {
        path: 'reports',
        element: page(
          () => import('@/features/reports/pages/ReportsPage'),
          (m) => m.ReportsPage,
        ),
      },
      {
        path: 'agents/:agentId',
        element: page(
          () => import('@/features/dashboard/pages/AgentPerformancePage'),
          (m) => m.AgentPerformancePage,
        ),
      },
      {
        path: 'calls',
        element: page(
          () => import('@/features/calls/pages/CallsPage'),
          (m) => m.CallsPage,
        ),
      },
      {
        path: 'calls/upload',
        element: page(
          () => import('@/features/calls/pages/UploadPage'),
          (m) => m.UploadPage,
        ),
      },
      {
        path: 'calls/:callId',
        element: page(
          () => import('@/features/calls/pages/CallDetailPage'),
          (m) => m.CallDetailPage,
        ),
      },
      {
        path: 'evaluations',
        element: page(
          () => import('@/features/evaluations/pages/EvaluationsPage'),
          (m) => m.EvaluationsPage,
        ),
      },
      {
        path: 'admin/agents',
        element: page(
          () => import('@/features/agents/pages/AgentsAdminPage'),
          (m) => m.AgentsAdminPage,
        ),
      },
      {
        path: 'admin/scorecard',
        element: page(
          () => import('@/features/scorecards/pages/ScorecardPage'),
          (m) => m.ScorecardPage,
        ),
      },
      {
        path: 'admin/queues',
        element: page(
          () => import('@/features/queues/pages/QueuesAdminPage'),
          (m) => m.QueuesAdminPage,
        ),
      },
      {
        path: 'admin/ai',
        element: page(
          () => import('@/features/ai-admin/pages/AiAdminPage'),
          (m) => m.AiAdminPage,
        ),
      },
      {
        path: 'admin/dictionary',
        element: page(
          () => import('@/features/dictionary/pages/DictionaryPage'),
          (m) => m.DictionaryPage,
        ),
      },
      {
        path: 'admin/pbx',
        element: page(
          () => import('@/features/pbx-admin/pages/PbxAdminPage'),
          (m) => m.PbxAdminPage,
        ),
      },
      {
        path: 'admin/notifications',
        element: page(
          () => import('@/features/notifications/pages/NotificationsPage'),
          (m) => m.NotificationsPage,
        ),
      },
      {
        path: 'admin/reports',
        element: page(
          () => import('@/features/reports/pages/ReportSettingsPage'),
          (m) => m.ReportSettingsPage,
        ),
      },
      {
        path: 'admin/users',
        element: page(
          () => import('@/features/users/pages/UsersAdminPage'),
          (m) => m.UsersAdminPage,
        ),
      },
      {
        path: 'admin/security',
        element: page(
          () => import('@/features/security/pages/SecurityAdminPage'),
          (m) => m.SecurityAdminPage,
        ),
      },
      {
        path: 'account/security',
        element: page(
          () => import('@/features/security/pages/AccountSecurityPage'),
          (m) => m.AccountSecurityPage,
        ),
      },
      {
        path: 'admin/storage',
        element: page(
          () => import('@/features/storage/pages/StorageAdminPage'),
          (m) => m.StorageAdminPage,
        ),
      },
      {
        path: 'admin/backups',
        element: page(
          () => import('@/features/backups/pages/BackupsAdminPage'),
          (m) => m.BackupsAdminPage,
        ),
      },
      {
        path: 'admin/audit',
        element: page(
          () => import('@/features/audit-log/pages/AuditLogPage'),
          (m) => m.AuditLogPage,
        ),
      },
      {
        path: 'admin/settings',
        element: page(
          () => import('@/features/settings/pages/SettingsPage'),
          (m) => m.SettingsPage,
        ),
      },
      {
        path: 'admin/planned',
        element: page(
          () => import('@/features/settings/pages/PlannedAreasPage'),
          (m) => m.PlannedAreasPage,
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

/**
 * History routing by default (FastAPI must serve index.html for non-/api paths).
 * Set VITE_ROUTER_MODE=hash at build time if the host cannot provide that fallback.
 */
export function createAppRouter() {
  const create =
    import.meta.env.VITE_ROUTER_MODE === 'hash' ? createHashRouter : createBrowserRouter;
  return create(routes, { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' });
}
