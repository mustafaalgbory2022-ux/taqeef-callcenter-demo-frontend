import type { Permission, Session } from '@/shared/types/domain';
import { arrayOf, nullable, object, oneOf, str, type Decoded } from '../decode';

const PERMISSIONS = [
  'agents.manage',
  'scorecards.manage',
  'calls.upload',
  'evaluations.rescore',
  'calls.review',
  'reports.export',
  'reports.manage',
  'settings.manage',
  'queues.manage',
  'ai.manage',
  'dictionary.manage',
  'dictionary.review',
  'pbx.manage',
  'notifications.manage',
] as const satisfies readonly Permission[];

export const wireSession = object({
  mode: oneOf(['mock', 'live']),
  display_name: str,
  permissions: arrayOf(str),
  expires_at: nullable(str),
});

export function sessionFromWire(w: Decoded<typeof wireSession>): Session {
  return {
    mode: w.mode,
    displayName: w.display_name,
    // Unknown permissions from a newer backend are ignored rather than rejected.
    permissions: w.permissions.filter((p): p is Permission =>
      (PERMISSIONS as readonly string[]).includes(p),
    ),
    expiresAt: w.expires_at,
  };
}
