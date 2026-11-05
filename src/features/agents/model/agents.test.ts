import { describe, expect, it } from 'vitest';
import type { Agent } from '@/shared/types/domain';
import { emptyAgentInput, normalizeAgentName, sortAgents, validateAgent } from './agents';

const agent = (
  id: string,
  displayName: string,
  extension: string | null,
  status: Agent['status'] = 'active',
): Agent => ({
  id,
  displayName,
  extension,
  status,
  synthetic: true,
  createdAt: '',
  updatedAt: '',
});

const existing = [
  agent('a1', 'Agent B', 'SYN-102'),
  agent('a2', 'Agent A', 'SYN-101'),
  agent('a3', 'Agent  Old', null, 'retired'),
];

describe('validateAgent (contract v0.2.1 §A)', () => {
  it('requires a name; the extension is an optional provisional label', () => {
    expect(validateAgent(emptyAgentInput, existing)).toEqual({
      displayName: 'agents.form.errors.nameRequired',
    });
    expect(validateAgent({ displayName: 'Agent C', extension: '' }, existing)).toEqual({});
    expect(validateAgent({ displayName: 'Agent C', extension: '!' }, existing).extension).toBe(
      'agents.form.errors.extensionFormat',
    );
  });

  it('keeps names unique after normalization, retired agents included', () => {
    expect(normalizeAgentName('  Agent   OLD ')).toBe('agent old');
    expect(validateAgent({ displayName: 'agent a', extension: '' }, existing).displayName).toBe(
      'agents.form.errors.nameTaken',
    );
    expect(validateAgent({ displayName: ' agent  old', extension: '' }, existing).displayName).toBe(
      'agents.form.errors.nameTaken',
    );
  });

  it('rejects an extension used by another agent (case-insensitive)', () => {
    const input = { displayName: 'New', extension: 'syn-101' };
    expect(validateAgent(input, existing).extension).toBe('agents.form.errors.extensionTaken');
  });
});

describe('sortAgents', () => {
  it('sorts by name, never by performance', () => {
    expect(sortAgents(existing).map((a) => a.displayName)).toEqual([
      'Agent  Old',
      'Agent A',
      'Agent B',
    ]);
  });
});
