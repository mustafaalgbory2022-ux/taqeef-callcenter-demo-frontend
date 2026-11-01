import type { MessageKey } from '@/shared/i18n/translate';
import type { Agent, Queue, QueueInput } from '@/shared/types/domain';

export type QueueField = 'number' | 'nameEn' | 'nameAr' | 'description';
export type QueueErrors = Partial<Record<QueueField, MessageKey>>;

export const QUEUE_NUMBER = /^\d{3,6}$/;

export const emptyQueueInput: QueueInput = {
  number: '',
  name: { en: '', ar: '' },
  description: '',
};

export function toQueueInput(q: Queue): QueueInput {
  return { number: q.number, name: q.name, description: q.description ?? '' };
}

export const isActive = (q: Queue) => (q.status ?? 'active') === 'active';

/** Client-side validation mirroring the server rules. Errors are i18n keys. */
export function validateQueue(
  input: QueueInput,
  queues: readonly Queue[],
  selfId: string | null,
): QueueErrors {
  const errors: QueueErrors = {};
  const number = input.number.trim();
  if (!QUEUE_NUMBER.test(number)) errors.number = 'queueAdmin.errors.numberFormat';
  else if (queues.some((q) => q.id !== selfId && q.number === number))
    errors.number = 'queueAdmin.errors.numberTaken';
  if (!input.name.en.trim()) errors.nameEn = 'queueAdmin.errors.nameRequired';
  else if (input.name.en.trim().length > 60) errors.nameEn = 'queueAdmin.errors.nameTooLong';
  if (!input.name.ar.trim()) errors.nameAr = 'queueAdmin.errors.nameRequired';
  else if (input.name.ar.trim().length > 60) errors.nameAr = 'queueAdmin.errors.nameTooLong';
  if (input.description.trim().length > 200)
    errors.description = 'queueAdmin.errors.descriptionTooLong';
  return errors;
}

export const QUEUE_SERVER_FIELD: Record<string, QueueField> = {
  number: 'number',
  name_en: 'nameEn',
  name_ar: 'nameAr',
  description: 'description',
};

/** Renumbering re-maps PBX statistics and recordings, so it needs explicit confirmation. */
export function needsRenumberConfirmation(queue: Queue | null, input: QueueInput): boolean {
  return queue !== null && queue.number !== input.number.trim();
}

/** Agents currently assigned to a queue, alphabetical (no ranking). */
export function assignedAgents(queueId: string, agents: readonly Agent[]): Agent[] {
  return agents
    .filter((a) => a.queueIds.includes(queueId))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export interface AssignmentDiff {
  added: Agent[];
  removed: Agent[];
}

export function assignmentDiff(
  queueId: string,
  agents: readonly Agent[],
  selected: ReadonlySet<string>,
): AssignmentDiff {
  return {
    added: agents.filter((a) => !a.queueIds.includes(queueId) && selected.has(a.id)),
    removed: agents.filter((a) => a.queueIds.includes(queueId) && !selected.has(a.id)),
  };
}

/** Stable order by queue number; disabled queues after active ones. */
export function sortQueues(queues: readonly Queue[]): Queue[] {
  return [...queues].sort(
    (a, b) => Number(isActive(b)) - Number(isActive(a)) || a.number.localeCompare(b.number),
  );
}
