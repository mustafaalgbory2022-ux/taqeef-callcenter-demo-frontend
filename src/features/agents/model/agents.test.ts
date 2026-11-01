import { describe, expect, it } from 'vitest';
import type { Agent } from '@/shared/types/domain';
import { emptyAgentInput, sortAgents, validateAgent } from './agents';

const agent = (id: string, displayName: string, extension: string): Agent => ({
  id,
  displayName,
  extension,
  status: 'active',
  queueIds: [],
  synthetic: true,
  createdAt: '',
  updatedAt: '',
});

const existing = [agent('a1', 'Agent B', 'SYN-102'), agent('a2', 'Agent A', 'SYN-101')];

describe('validateAgent', () => {
  it('requires a name and a valid extension', () => {
    expect(validateAgent(emptyAgentInput, existing, null)).toEqual({
      displayName: 'agents.form.errors.nameRequired',
      extension: 'agents.form.errors.extensionFormat',
    });
  });

  it('rejects an extension used by another agent (case-insensitive)', () => {
    const input = { ...emptyAgentInput, displayName: 'New', extension: 'syn-101' };
    expect(validateAgent(input, existing, null).extension).toBe(
      'agents.form.errors.extensionTaken',
    );
  });

  it('allows an agent to keep its own extension', () => {
    const input = { ...emptyAgentInput, displayName: 'Agent A', extension: 'SYN-101' };
    expect(validateAgent(input, existing, 'a2')).toEqual({});
  });
});

describe('sortAgents', () => {
  it('sorts by name, never by performance', () => {
    expect(sortAgents(existing).map((a) => a.displayName)).toEqual(['Agent A', 'Agent B']);
  });
});
