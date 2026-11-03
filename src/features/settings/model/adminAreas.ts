import type { MessageKey } from '@/shared/i18n/translate';

/**
 * Administration areas from docs/requirements/gui-administration.md and where each is managed
 * in the GUI. All have frontend screens; production behaviour depends on the backend.
 */
export interface AdminArea {
  id: string;
  title: MessageKey;
  to: string;
}

export const adminAreas: readonly AdminArea[] = [
  { id: 'ADM-01', title: 'nav.overview', to: '/' },
  { id: 'ADM-02', title: 'nav.agents', to: '/admin/agents' },
  { id: 'ADM-02', title: 'nav.queues', to: '/admin/queues' },
  { id: 'ADM-03', title: 'nav.pbx', to: '/admin/pbx' },
  { id: 'ADM-04', title: 'nav.ai', to: '/admin/ai' },
  { id: 'ADM-04', title: 'nav.dictionary', to: '/admin/dictionary' },
  { id: 'ADM-05', title: 'nav.scorecard', to: '/admin/scorecard' },
  { id: 'ADM-06', title: 'nav.calls', to: '/calls' },
  { id: 'ADM-07', title: 'nav.reportSettings', to: '/admin/reports' },
  { id: 'ADM-07', title: 'nav.notifications', to: '/admin/notifications' },
  { id: 'ADM-08', title: 'nav.users', to: '/admin/users' },
  { id: 'ADM-08', title: 'nav.security', to: '/admin/security' },
  { id: 'ADM-09', title: 'nav.storage', to: '/admin/storage' },
  { id: 'ADM-09', title: 'nav.backups', to: '/admin/backups' },
  { id: 'ADM-10', title: 'nav.health', to: '/admin/health' },
  { id: 'ADM-10', title: 'nav.audit', to: '/admin/audit' },
  { id: 'ADM-11', title: 'nav.general', to: '/admin/general' },
];
