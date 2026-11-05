import type { WireAgent, WireAudit } from '../types';

/** SYNTHETIC agents. Extensions use the SYN- prefix so they cannot be mistaken for real Yeastar numbers. */
const created = '2026-09-15T06:00:00.000Z';

const agent = (id: string, name: string, ext: string): WireAgent => ({
  id,
  display_name: name,
  extension: ext,
  status: 'active',
  synthetic: true,
  created_at: created,
  updated_at: created,
});

export const agents: WireAgent[] = [
  agent('agt-001', 'Agent A', 'SYN-101'),
  agent('agt-002', 'Agent B', 'SYN-102'),
  agent('agt-003', 'Agent C', 'SYN-103'),
  agent('agt-004', 'Agent D', 'SYN-104'),
];

export function initialAudit(a: WireAgent): WireAudit[] {
  return [
    {
      id: `${a.id}-audit-1`,
      action: 'created',
      actor: 'Synthetic administrator',
      at: a.created_at,
      changes: [
        { field: 'display_name', before: null, after: a.display_name },
        { field: 'extension', before: null, after: a.extension },
      ],
    },
  ];
}
