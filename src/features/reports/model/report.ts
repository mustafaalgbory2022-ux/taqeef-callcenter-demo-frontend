import type { AgentSummary } from '@/features/dashboard/model';
import type { Agent, DateRange, PbxMetrics, Queue, ReportPeriod } from '@/shared/types/domain';
import { periodRange } from '@/shared/utils/dates';
import { groupBy, summarizeAgent, summarizeQueue, type QueueSummary } from '@/shared/utils/pbx';
import { floorTo2 } from '@/shared/utils/score';
import type { Cell, Sheet } from '@/shared/utils/xlsx';

export function resolveRange(period: ReportPeriod, anchor: string, custom: DateRange): DateRange {
  return period === 'custom' ? custom : periodRange(period, anchor);
}

export interface QueueReportRow extends QueueSummary {
  queue: Queue;
}

export function buildQueueRows(
  pbx: PbxMetrics,
  queues: readonly Queue[],
  queueIds: readonly string[],
): QueueReportRow[] {
  const byQueue = groupBy(pbx.queueDaily, (r) => r.queueId);
  return queues
    .filter((q) => queueIds.includes(q.id))
    .map((queue) => ({ queue, ...summarizeQueue(byQueue.get(queue.id) ?? []) }));
}

export interface AgentReportRow {
  agent: Agent;
  scoredCalls: number;
  insufficientCalls: number;
  averageScore: number | null;
  lowScoreCalls: number;
  answered: number;
  missed: number;
  avgTalkS: number | null;
}

export function buildAgentRows(
  summaries: readonly AgentSummary[],
  pbx: PbxMetrics,
  agentIds: readonly string[],
): AgentReportRow[] {
  return summaries
    .filter((s) => agentIds.includes(s.agent.id))
    .map(({ agent, summary }) => ({
      agent,
      scoredCalls: summary.scoredCalls,
      insufficientCalls: summary.insufficientCalls,
      averageScore: summary.averageScore,
      lowScoreCalls: summary.lowScoreCalls,
      ...summarizeAgent(pbx.agentDaily.filter((r) => r.agentId === agent.id)),
    }));
}

export interface WorkbookLabels {
  summary: string;
  queues: string;
  agents: string;
  audio: string;
  headers: {
    queue: [string, string, string, string, string, string, string, string];
    agent: [string, string, string, string, string, string, string, string];
    audio: [string, string, string, string];
  };
  meta: [string, string][];
}

const round1 = (v: number | null): Cell => (v === null ? null : Math.round(v * 10) / 10);

/**
 * Excel workbook for a management report. Missed and abandoned are separate columns;
 * SLA uses the approved formula; quality scores are floored to two decimals.
 */
export function buildWorkbook(
  labels: WorkbookLabels,
  queueRows: readonly QueueReportRow[],
  agentRows: readonly AgentReportRow[],
  audio: readonly { agent: string; callId: string; recordedAt: string; durationS: number }[],
): Sheet[] {
  return [
    { name: labels.summary, rows: labels.meta.map(([k, v]) => [k, v]) },
    {
      name: labels.queues,
      rows: [
        labels.headers.queue,
        ...queueRows.map((r) => [
          `${r.queue.number} ${r.queue.name.en}`,
          r.incoming,
          r.answered,
          r.missed,
          r.abandoned,
          round1(r.slaPercent),
          round1(r.avgWaitS),
          r.maxWaitS,
        ]),
      ],
    },
    {
      name: labels.agents,
      rows: [
        labels.headers.agent,
        ...agentRows.map((r) => [
          `${r.agent.displayName} (${r.agent.extension})`,
          r.scoredCalls,
          r.insufficientCalls,
          r.averageScore === null ? null : floorTo2(r.averageScore),
          r.lowScoreCalls,
          r.answered,
          r.missed,
          round1(r.avgTalkS),
        ]),
      ],
    },
    {
      name: labels.audio,
      rows: [
        labels.headers.audio,
        ...audio.map((a) => [a.agent, a.callId, a.recordedAt, a.durationS]),
      ],
    },
  ];
}
