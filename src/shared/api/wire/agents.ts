import type { Agent, AgentInput, AuditEntry } from '@/shared/types/domain';
import { arrayOf, bool, nullable, object, oneOf, str, type Decoded } from '../decode';
import { utcTimestamp } from './common';

export const wireAgent = object({
  id: str,
  display_name: str,
  extension: str,
  status: oneOf(['active', 'inactive']),
  synthetic: bool,
  created_at: utcTimestamp,
  updated_at: utcTimestamp,
});

export function agentFromWire(w: Decoded<typeof wireAgent>): Agent {
  return {
    id: w.id,
    displayName: w.display_name,
    extension: w.extension,
    status: w.status,
    synthetic: w.synthetic,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
}

export function agentInputToWire(input: Partial<AgentInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.displayName !== undefined) out.display_name = input.displayName.trim();
  if (input.extension !== undefined) out.extension = input.extension.trim();
  if (input.status !== undefined) out.status = input.status;
  return out;
}

export const wireAuditEntry = object({
  id: str,
  action: oneOf(['created', 'updated', 'disabled', 'enabled']),
  actor: str,
  at: utcTimestamp,
  changes: arrayOf(object({ field: str, before: nullable(str), after: nullable(str) })),
});

export function auditFromWire(w: Decoded<typeof wireAuditEntry>): AuditEntry {
  return { id: w.id, action: w.action, actor: w.actor, at: w.at, changes: w.changes };
}
