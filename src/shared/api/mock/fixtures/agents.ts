import type { WireAgent, WireAudit, WireQueue } from '../types';

/** SYNTHETIC agents and queues. Extensions use the SYN- prefix so they cannot be mistaken for real Yeastar numbers. */
export const queues: WireQueue[] = [
  { id: 'q-6001', number: '6001', name: { en: 'Sales', ar: 'المبيعات' } },
  { id: 'q-6002', number: '6002', name: { en: 'After-Sales', ar: 'ما بعد البيع' } },
];

const created = '2026-09-15T09:00:00+03:00';

const agent = (id: string, name: string, ext: string, queueIds: string[]): WireAgent => ({
  id,
  display_name: name,
  extension: ext,
  status: 'active',
  queue_ids: queueIds,
  synthetic: true,
  created_at: created,
  updated_at: created,
});

export const agents: WireAgent[] = [
  agent('agt-001', 'Agent A', 'SYN-101', ['q-6002']),
  agent('agt-002', 'Agent B', 'SYN-102', ['q-6001']),
  agent('agt-003', 'Agent C', 'SYN-103', ['q-6002']),
  agent('agt-004', 'Agent D', 'SYN-104', ['q-6001', 'q-6002']),
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
