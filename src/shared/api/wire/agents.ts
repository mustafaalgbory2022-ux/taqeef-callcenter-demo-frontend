import type { Agent, AgentInput, AuditEntry, Queue } from '@/shared/types/domain';
import { arrayOf, bool, nullable, object, oneOf, str, type Decoded } from '../decode';
import { localizedText } from './common';

export const wireQueue = object({ id: str, number: str, name: localizedText });

export function queueFromWire(w: Decoded<typeof wireQueue>): Queue {
  return { id: w.id, number: w.number, name: w.name };
}

export const wireAgent = object({
  id: str,
  display_name: str,
  extension: str,
  status: oneOf(['active', 'inactive']),
  queue_ids: arrayOf(str),
  synthetic: bool,
  created_at: str,
  updated_at: str,
});

export function agentFromWire(w: Decoded<typeof wireAgent>): Agent {
  return {
    id: w.id,
    displayName: w.display_name,
    extension: w.extension,
    status: w.status,
    queueIds: w.queue_ids,
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
  if (input.queueIds !== undefined) out.queue_ids = [...input.queueIds];
  return out;
}

export const wireAuditEntry = object({
  id: str,
  action: oneOf(['created', 'updated', 'disabled', 'enabled']),
  actor: str,
  at: str,
  changes: arrayOf(object({ field: str, before: nullable(str), after: nullable(str) })),
});

export function auditFromWire(w: Decoded<typeof wireAuditEntry>): AuditEntry {
  return { id: w.id, action: w.action, actor: w.actor, at: w.at, changes: w.changes };
}
