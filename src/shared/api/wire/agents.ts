import type { Agent, AgentInput } from '@/shared/types/domain';
import { nullable, object, str, type Decoded } from '../decode';
import { utcTimestamp } from './common';
import { opaqueId } from './ids';

/**
 * Agent object (contract v0.3 §4.1; shape PROPOSED, identity and lifecycle CONFIRMED).
 * `display_name` arrives MASKED on this route (§2.2.1); raw names exist only on the separate
 * edit route #39, which this demo does not need (names are immutable, nothing is pre-filled).
 */
export const wireAgent = object({
  agent_id: opaqueId,
  display_name: str,
  created_at: utcTimestamp,
  retired_at: nullable(utcTimestamp),
});

export function agentFromWire(w: Decoded<typeof wireAgent>): Agent {
  return {
    id: w.agent_id,
    displayName: w.display_name,
    createdAt: w.created_at,
    retiredAt: w.retired_at,
    status: w.retired_at === null ? 'active' : 'retired',
  };
}

/** `POST /api/agents` body (contract v0.3 §4.2): the name and the action's request id. */
export function agentInputToWire(input: AgentInput, requestId: string): Record<string, unknown> {
  return { request_id: requestId, display_name: input.displayName.trim() };
}
