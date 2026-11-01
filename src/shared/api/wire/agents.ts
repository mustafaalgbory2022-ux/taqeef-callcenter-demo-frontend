import type { Agent, AgentInput, AuditEntry, Queue, QueueInput } from '@/shared/types/domain';
import { arrayOf, bool, nullable, object, oneOf, str, withDefault, type Decoded } from '../decode';
import { localizedText } from './common';

/** PROVISIONAL: status/description/timestamps are optional so the Phase A shape still decodes. */
export const wireQueue = object({
  id: str,
  number: str,
  name: localizedText,
  status: withDefault(oneOf(['active', 'disabled']), 'active'),
  description: withDefault(str, ''),
  synthetic: withDefault(bool, false),
  created_at: nullable(str),
  updated_at: nullable(str),
});

export function queueFromWire(w: Decoded<typeof wireQueue>): Queue {
  return {
    id: w.id,
    number: w.number,
    name: w.name,
    status: w.status,
    description: w.description,
    synthetic: w.synthetic,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
}

export function queueInputToWire(input: Partial<QueueInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.number !== undefined) out.number = input.number.trim();
  if (input.name !== undefined) out.name = { en: input.name.en.trim(), ar: input.name.ar.trim() };
  if (input.description !== undefined) out.description = input.description.trim();
  return out;
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
