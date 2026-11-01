import type { Queue, QueueInput, QueueStatus } from '@/shared/types/domain';
import { endpoints } from '../endpoints';
import type { Send } from '../send';
import { queueFromWire, queueInputToWire, wireQueue } from '../wire/agents';

/**
 * Queue administration (PROVISIONAL routes). Destructive changes — renumbering, disabling,
 * removing agents — must carry `confirm: true`; the server rejects them otherwise (409).
 * Queues are never deleted, so their history stays intact.
 */
export interface QueueAdminApi {
  create(input: QueueInput): Promise<Queue>;
  update(id: string, patch: Partial<QueueInput>, confirm: boolean): Promise<Queue>;
  setStatus(id: string, status: QueueStatus): Promise<Queue>;
  assignAgents(id: string, agentIds: readonly string[], confirm: boolean): Promise<Queue>;
}

export function createQueueAdminApi(send: Send): QueueAdminApi {
  return {
    create: (input) =>
      send(
        { method: 'POST', path: endpoints.queues, body: queueInputToWire(input) },
        wireQueue,
        queueFromWire,
      ),
    update: (id, patch, confirm) =>
      send(
        {
          method: 'PATCH',
          path: endpoints.queue(id),
          body: { ...queueInputToWire(patch), confirm },
        },
        wireQueue,
        queueFromWire,
      ),
    setStatus: (id, status) =>
      send(
        { method: 'PATCH', path: endpoints.queue(id), body: { status, confirm: true } },
        wireQueue,
        queueFromWire,
      ),
    assignAgents: (id, agentIds, confirm) =>
      send(
        {
          method: 'PUT',
          path: endpoints.queueAgents(id),
          body: { agent_ids: [...agentIds], confirm },
        },
        wireQueue,
        queueFromWire,
      ),
  };
}
