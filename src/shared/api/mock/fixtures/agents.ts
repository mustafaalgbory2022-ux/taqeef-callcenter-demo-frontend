import type { WireAgent } from '../types';

/** SYNTHETIC agents with fictional names (contract v0.3 §4: no extensions, no history route). */
const created = '2026-09-15T06:00:00.000Z';

const agent = (id: string, name: string): WireAgent => ({
  agent_id: id,
  display_name: name,
  created_at: created,
  retired_at: null,
});

export const agents: WireAgent[] = [
  agent('agt-001', 'Agent A'),
  agent('agt-002', 'Agent B'),
  agent('agt-003', 'Agent C'),
  agent('agt-004', 'Agent D'),
];
