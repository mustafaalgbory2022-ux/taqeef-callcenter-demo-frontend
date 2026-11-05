import type { Agent, AgentInput } from '@/shared/types/domain';
import type { MessageKey } from '@/shared/i18n/translate';
import { EXTENSION_PATTERN, isBlank } from '@/shared/utils/validation';

export type AgentField = 'displayName' | 'extension';
export type AgentErrors = Partial<Record<AgentField, MessageKey>>;

export const emptyAgentInput: AgentInput = { displayName: '', extension: '' };

/** Case-insensitive, whitespace-collapsed form used for name uniqueness (contract v0.2.1 §A). */
export function normalizeAgentName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

/**
 * Client-side validation for creating an agent, mirroring server rules. Errors are i18n
 * message keys. Names are unique across ALL agents, retired included (never reused).
 */
export function validateAgent(input: AgentInput, agents: readonly Agent[]): AgentErrors {
  const errors: AgentErrors = {};
  const name = normalizeAgentName(input.displayName);
  if (isBlank(input.displayName)) errors.displayName = 'agents.form.errors.nameRequired';
  else if (input.displayName.trim().length > 80)
    errors.displayName = 'agents.form.errors.nameTooLong';
  else if (agents.some((a) => normalizeAgentName(a.displayName) === name))
    errors.displayName = 'agents.form.errors.nameTaken';

  // Extension is a PROVISIONAL optional label (not defined by contract v0.2.1).
  const ext = input.extension.trim();
  if (ext && !EXTENSION_PATTERN.test(ext)) errors.extension = 'agents.form.errors.extensionFormat';
  else if (ext && agents.some((a) => a.extension?.toLowerCase() === ext.toLowerCase())) {
    errors.extension = 'agents.form.errors.extensionTaken';
  }
  return errors;
}

/** Map server (snake_case) field names to form fields. */
export const SERVER_FIELD: Record<string, AgentField> = {
  display_name: 'displayName',
  extension: 'extension',
};

/** Alphabetical by name — never by score (no rankings). */
export function sortAgents(agents: readonly Agent[]): Agent[] {
  return [...agents].sort(
    (a, b) =>
      a.displayName.localeCompare(b.displayName) ||
      (a.extension ?? '').localeCompare(b.extension ?? ''),
  );
}
