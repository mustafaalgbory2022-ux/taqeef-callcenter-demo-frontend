import type { Agent, AgentInput } from '@/shared/types/domain';
import type { MessageKey } from '@/shared/i18n/translate';
import { isBlank } from '@/shared/utils/validation';

export type AgentField = 'displayName';
export type AgentErrors = Partial<Record<AgentField, MessageKey>>;

export const emptyAgentInput: AgentInput = { displayName: '' };

/** The server's masking token (contract v0.3 §2.2). */
export const MASK_TOKEN = '[NUMBER]';

/** Case-insensitive, whitespace-collapsed form (a convenience; the server's name_key decides). */
export function normalizeAgentName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

/**
 * Client-side checks before `POST /api/agents`. The server is authoritative (name rules,
 * Arabic spelling variants via `name_key`); these only give early feedback. A value that
 * contains the masking token is refused here too, so a masked presentation value is never
 * submitted as an original (contract v0.3 §2.2.1 write path).
 */
export function validateAgent(input: AgentInput, agents: readonly Agent[]): AgentErrors {
  const errors: AgentErrors = {};
  const name = normalizeAgentName(input.displayName);
  if (isBlank(input.displayName)) errors.displayName = 'agents.form.errors.nameRequired';
  else if (input.displayName.includes(MASK_TOKEN))
    errors.displayName = 'agents.form.errors.edit_value_masked';
  else if (input.displayName.trim().length > 80)
    errors.displayName = 'agents.form.errors.nameTooLong';
  else if (agents.some((a) => normalizeAgentName(a.displayName) === name))
    errors.displayName = 'agents.form.errors.nameTaken';
  return errors;
}

/** Map server (snake_case) field names to form fields. */
export const SERVER_FIELD: Record<string, AgentField> = { display_name: 'displayName' };

/** Alphabetical by name — never by score (no rankings). */
export function sortAgents(agents: readonly Agent[]): Agent[] {
  return [...agents].sort(
    (a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id),
  );
}
