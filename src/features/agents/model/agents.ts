import type { Agent, AgentInput, Language, Queue } from '@/shared/types/domain';
import type { MessageKey } from '@/shared/i18n/translate';
import { EXTENSION_PATTERN, isBlank } from '@/shared/utils/validation';

export type AgentField = 'displayName' | 'extension' | 'status' | 'queueIds';
export type AgentErrors = Partial<Record<AgentField, MessageKey>>;

export const emptyAgentInput: AgentInput = {
  displayName: '',
  extension: '',
  status: 'active',
  queueIds: [],
};

export function toAgentInput(agent: Agent): AgentInput {
  return {
    displayName: agent.displayName,
    extension: agent.extension,
    status: agent.status,
    queueIds: agent.queueIds,
  };
}

/** Client-side validation mirroring server rules. Errors are i18n message keys. */
export function validateAgent(
  input: AgentInput,
  agents: readonly Agent[],
  selfId: string | null,
): AgentErrors {
  const errors: AgentErrors = {};
  if (isBlank(input.displayName)) errors.displayName = 'agents.form.errors.nameRequired';
  else if (input.displayName.trim().length > 80)
    errors.displayName = 'agents.form.errors.nameTooLong';

  const ext = input.extension.trim();
  if (!EXTENSION_PATTERN.test(ext)) errors.extension = 'agents.form.errors.extensionFormat';
  else if (agents.some((a) => a.id !== selfId && a.extension.toLowerCase() === ext.toLowerCase())) {
    errors.extension = 'agents.form.errors.extensionTaken';
  }
  return errors;
}

/** Map server (snake_case) field names to form fields. */
export const SERVER_FIELD: Record<string, AgentField> = {
  display_name: 'displayName',
  extension: 'extension',
  status: 'status',
  queue_ids: 'queueIds',
};

/** Alphabetical by name — never by score (no rankings). */
export function sortAgents(agents: readonly Agent[]): Agent[] {
  return [...agents].sort(
    (a, b) => a.displayName.localeCompare(b.displayName) || a.extension.localeCompare(b.extension),
  );
}

export function queueNames(
  ids: readonly string[],
  queues: readonly Queue[],
  lang: Language,
): string {
  return ids
    .map((id) => queues.find((q) => q.id === id)?.name[lang] ?? id)
    .join(lang === 'ar' ? '، ' : ', ');
}
