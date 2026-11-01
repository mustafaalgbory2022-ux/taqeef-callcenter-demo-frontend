import type { WireAgent, WireAudit, WireQueue } from '../types';

/** SYNTHETIC agents and queues. Extensions use the SYN- prefix so they cannot be mistaken for real Yeastar numbers. */
export const queues: WireQueue[] = [
  { id: 'q-billing', name: { en: 'Billing', ar: 'الفواتير' } },
  { id: 'q-support', name: { en: 'Technical support', ar: 'الدعم الفني' } },
  { id: 'q-sales', name: { en: 'Sales and plans', ar: 'المبيعات والباقات' } },
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
  agent('agt-001', 'Agent A', 'SYN-101', ['q-billing']),
  agent('agt-002', 'Agent B', 'SYN-102', ['q-sales', 'q-billing']),
  agent('agt-003', 'Agent C', 'SYN-103', ['q-support']),
  agent('agt-004', 'Agent D', 'SYN-104', ['q-support']),
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
