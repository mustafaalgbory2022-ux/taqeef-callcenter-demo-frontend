import type { MessageKey } from '@/shared/i18n/translate';

/**
 * Production administration areas recorded in docs/requirements/gui-administration.md.
 * Shown in the GUI as planned (not built yet) so the full scope is visible. ADM-03 (PBX),
 * ADM-04 (AI, dictionary) and ADM-07 (reports, notifications) were built in Phase B.
 */
export interface AdminArea {
  id: string;
  title: MessageKey;
  scope: MessageKey;
}

export const plannedAreas: readonly AdminArea[] = [
  {
    id: 'ADM-08',
    title: 'settings.planned.security.title',
    scope: 'settings.planned.security.scope',
  },
  {
    id: 'ADM-09',
    title: 'settings.planned.storage.title',
    scope: 'settings.planned.storage.scope',
  },
  { id: 'ADM-10', title: 'settings.planned.health.title', scope: 'settings.planned.health.scope' },
  {
    id: 'ADM-11',
    title: 'settings.planned.branding.title',
    scope: 'settings.planned.branding.scope',
  },
];
