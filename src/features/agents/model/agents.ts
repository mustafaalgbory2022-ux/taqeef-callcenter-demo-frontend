import type { Agent, AgentInput } from '@/shared/types/domain';
import type { MessageKey } from '@/shared/i18n/translate';
import { EXTENSION_PATTERN, isBlank } from '@/shared/utils/validation';

export type AgentField = 'displayName' | 'extension' | 'status';
export type AgentErrors = Partial<Record<AgentField, MessageKey>>;

export const emptyAgentInput: AgentInput = {
  displayName: '',
  extension: '',
  status: 'active',
};

export function toAgentInput(agent: Agent): AgentInput {
  return {
    displayName: agent.displayName,
    extension: agent.extension,
    status: agent.status,
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
};

/** Alphabetical by name — never by score (no rankings). */
export function sortAgents(agents: readonly Agent[]): Agent[] {
  return [...agents].sort(
    (a, b) => a.displayName.localeCompare(b.displayName) || a.extension.localeCompare(b.extension),
  );
}
