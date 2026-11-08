import { describe, expect, it } from 'vitest';
import type { Agent } from '@/shared/types/domain';
import { emptyAgentInput, normalizeAgentName, sortAgents, validateAgent } from './agents';

const agent = (id: string, displayName: string, retiredAt: string | null = null): Agent => ({
  id,
  displayName,
  createdAt: '2026-11-05T09:30:00.000Z',
  retiredAt,
  status: retiredAt ? 'retired' : 'active',
});

const existing = [
  agent('a1', 'Agent B'),
  agent('a2', 'Agent A'),
  agent('a3', 'Agent  Old', '2026-11-06T09:30:00.000Z'),
];

describe('validateAgent (contract v0.3 §4)', () => {
  it('requires a name', () => {
    expect(validateAgent(emptyAgentInput, existing)).toEqual({
      displayName: 'agents.form.errors.nameRequired',
    });
    expect(validateAgent({ displayName: 'Agent C' }, existing)).toEqual({});
  });

  it('never submits a masked presentation value as an original (§2.2.1)', () => {
    expect(validateAgent({ displayName: 'Agent [NUMBER]' }, existing).displayName).toBe(
      'agents.form.errors.edit_value_masked',
    );
  });

  it('keeps names unique after normalization, retired agents included', () => {
    expect(normalizeAgentName('  Agent   OLD ')).toBe('agent old');
    expect(validateAgent({ displayName: 'agent a' }, existing).displayName).toBe(
      'agents.form.errors.nameTaken',
    );
    expect(validateAgent({ displayName: ' agent  old' }, existing).displayName).toBe(
      'agents.form.errors.nameTaken',
    );
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
