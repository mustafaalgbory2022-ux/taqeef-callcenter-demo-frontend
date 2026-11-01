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
    label: 'nav.performance',
    items: [
      { to: '/', label: 'nav.overview', icon: 'dashboard', keepAgentFilter: true, end: true },
      { to: '/calls', label: 'nav.calls', icon: 'phone', keepAgentFilter: true },
      { to: '/evaluations', label: 'nav.evaluations', icon: 'history', keepAgentFilter: true },
    ],
  },
  {
    label: 'nav.administration',
    items: [
      { to: '/admin/agents', label: 'nav.agents', icon: 'users' },
      { to: '/admin/scorecard', label: 'nav.scorecard', icon: 'clipboard' },
      { to: '/admin/settings', label: 'nav.settings', icon: 'settings' },
      { to: '/admin/planned', label: 'nav.planned', icon: 'grid' },
    ],
  },
];
