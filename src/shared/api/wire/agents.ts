import type { Agent, AgentInput, AuditEntry } from '@/shared/types/domain';
import { arrayOf, bool, nullable, object, oneOf, str, type Decoded } from '../decode';
import { utcTimestamp } from './common';

export const wireAgent = object({
  id: str,
  display_name: str,
  // PROVISIONAL: `extension` and `status` are not defined by contract v0.2.1.
  extension: nullable(str),
  status: oneOf(['active', 'retired']),
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

/** `POST /api/agents` body (PROPOSED). No status: a new agent is active. */
export function agentInputToWire(input: AgentInput): Record<string, unknown> {
  const out: Record<string, unknown> = { display_name: input.displayName.trim() };
  if (input.extension.trim()) out.extension = input.extension.trim();
  return out;
}

export const wireAuditEntry = object({
  id: str,
  action: oneOf(['created', 'retired']),
  actor: str,
  at: utcTimestamp,
  changes: arrayOf(object({ field: str, before: nullable(str), after: nullable(str) })),
});

export function auditFromWire(w: Decoded<typeof wireAuditEntry>): AuditEntry {
  return { id: w.id, action: w.action, actor: w.actor, at: w.at, changes: w.changes };
}
