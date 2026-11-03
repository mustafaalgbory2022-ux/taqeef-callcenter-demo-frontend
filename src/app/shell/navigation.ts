import type { MessageKey } from '@/shared/i18n/translate';
import type { IconName } from '@/shared/ui/Icon';

export interface NavItem {
  to: string;
  label: MessageKey;
  icon: IconName;
  /** Keep the agent filter (?agent=) when navigating between performance views. */
  keepAgentFilter?: boolean;
  end?: boolean;
}

export interface NavGroup {
  label: MessageKey;
  items: readonly NavItem[];
}

export const navigation: readonly NavGroup[] = [
  {
    label: 'nav.operations',
    items: [
      { to: '/', label: 'nav.overview', icon: 'dashboard', keepAgentFilter: true, end: true },
      { to: '/live', label: 'nav.live', icon: 'phone' },
      { to: '/agents', label: 'nav.agentPerformance', icon: 'users', end: true },
      { to: '/calls', label: 'nav.calls', icon: 'clipboard', keepAgentFilter: true },
      { to: '/insights', label: 'nav.insights', icon: 'info' },
      { to: '/reports', label: 'nav.reports', icon: 'arrowDown' },
    ],
  },
  {
    label: 'nav.quality',
    items: [
      { to: '/evaluations', label: 'nav.evaluations', icon: 'history', keepAgentFilter: true },
      { to: '/admin/scorecard', label: 'nav.scorecard', icon: 'check' },
    ],
  },
  {
    label: 'nav.administration',
    items: [
      { to: '/admin/agents', label: 'nav.agents', icon: 'users' },
      { to: '/admin/queues', label: 'nav.queues', icon: 'layers' },
      { to: '/admin/ai', label: 'nav.ai', icon: 'cpu' },
      { to: '/admin/dictionary', label: 'nav.dictionary', icon: 'book' },
      { to: '/admin/pbx', label: 'nav.pbx', icon: 'plug' },
      { to: '/admin/notifications', label: 'nav.notifications', icon: 'mail' },
      { to: '/admin/reports', label: 'nav.reportSettings', icon: 'clipboard' },
      { to: '/admin/settings', label: 'nav.settings', icon: 'settings' },
      { to: '/admin/planned', label: 'nav.planned', icon: 'grid' },
    ],
  },
  {
    label: 'nav.system',
    items: [
      { to: '/admin/users', label: 'nav.users', icon: 'users' },
      { to: '/admin/security', label: 'nav.security', icon: 'lock' },
      { to: '/admin/audit', label: 'nav.audit', icon: 'history' },
      { to: '/account/security', label: 'nav.account', icon: 'settings' },
    ],
  },
];
