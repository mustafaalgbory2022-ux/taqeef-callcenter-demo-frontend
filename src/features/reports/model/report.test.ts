import { describe, expect, it } from 'vitest';
import type { PbxMetrics, Queue } from '@/shared/types/domain';
import { buildQueueRows, buildWorkbook, resolveRange, type WorkbookLabels } from './report';

const queues: Queue[] = [
  { id: 'q-6001', number: '6001', name: { en: 'Sales', ar: 'المبيعات' } },
  { id: 'q-6002', number: '6002', name: { en: 'After-Sales', ar: 'ما بعد البيع' } },
];
const pbx: PbxMetrics = {
  simulated: true,
  agentDaily: [],
  queueDaily: [
    {
      date: '2026-10-01',
      queueId: 'q-6001',
      incoming: 100,
      answered: 90,
      missed: 4,
      abandoned: 6,
      totalWaitS: 1000,
      maxWaitS: 90,
      totalTalkS: 9000,
    },
  ],
};
const labels: WorkbookLabels = {
  summary: 'Summary',
  queues: 'Queues',
  agents: 'Agents',
  audio: 'Audio sample',
  headers: {
    queue: [
      'Queue',
      'Incoming',
      'Answered',
      'Missed',
      'Abandoned',
      'SLA %',
      'Avg wait (s)',
      'Max wait (s)',
    ],
    agent: ['Agent', 'Scored', 'No score', 'Average', 'Low', 'Answered', 'Missed', 'Avg talk (s)'],
    audio: ['Agent', 'Call', 'Recorded', 'Duration (s)'],
  },
  meta: [['Period', 'weekly']],
};

describe('report model', () => {
  it('resolves report periods', () => {
    expect(resolveRange('monthly', '2026-10-15', { from: '', to: '' })).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(resolveRange('custom', '2026-10-15', { from: '2026-10-02', to: '2026-10-03' })).toEqual({
      from: '2026-10-02',
      to: '2026-10-03',
    });
  });

  it('keeps missed and abandoned separate and uses the approved SLA formula', () => {
    const rows = buildQueueRows(pbx, queues, ['q-6001']);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ missed: 4, abandoned: 6, slaPercent: 96 });
    const [, queueSheet] = buildWorkbook(labels, rows, [], []);
    expect(queueSheet?.rows[0]).toEqual(labels.headers.queue);
    expect(queueSheet?.rows[1]).toEqual(['6001 Sales', 100, 90, 4, 6, 96, 10, 90]);
  });
});
