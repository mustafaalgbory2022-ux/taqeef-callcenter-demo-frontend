import { ADMIN_AUDIT_ACTIONS, type AdminAuditEntry } from '@/shared/types/domain';
import { arrayOf, bool, nullable, object, oneOf, str, type Decoded } from '../decode';

export const ADMIN_RESOURCES = [
  'queue',
  'ai_config',
  'ai_jobs',
  'dictionary_entry',
  'dictionary_correction',
  'pbx_connector',
  'email_sender',
  'notification_rule',
  'email_template',
  'report_email',
  'report_settings',
  'report_run',
] as const;

/** PROVISIONAL shape of one append-only administration audit record. */
export const wireAdminAudit = object({
  id: str,
  resource: oneOf(ADMIN_RESOURCES),
  resource_id: nullable(str),
  action: oneOf(ADMIN_AUDIT_ACTIONS),
  actor: str,
  at: str,
  summary: str,
  changes: arrayOf(object({ field: str, before: nullable(str), after: nullable(str) })),
  simulated: bool,
});

export function adminAuditFromWire(w: Decoded<typeof wireAdminAudit>): AdminAuditEntry {
  return {
    id: w.id,
    resource: w.resource,
    resourceId: w.resource_id,
    action: w.action,
    actor: w.actor,
    at: w.at,
    summary: w.summary,
    changes: w.changes,
    simulated: w.simulated,
  };
}
