import type {
  AgentDailyStat,
  InsightRow,
  LiveStatus,
  PbxMetrics,
  QueueDailyStat,
  ReportRecord,
} from '@/shared/types/domain';
import { arrayOf, bool, nullable, num, object, oneOf, str, type Decoded } from '../decode';
import { CALL_REASONS } from './calls';

/* PBX daily metrics — PROVISIONAL shape; seconds for durations (Yeastar CDR convention). */
export const wirePbxMetrics = object({
  simulated: bool,
  queue_daily: arrayOf(
    object({
      date: str,
      queue_id: str,
      incoming: num,
      answered: num,
      missed: num,
      abandoned: num,
      total_wait_s: num,
      max_wait_s: num,
      total_talk_s: num,
    }),
  ),
  agent_daily: arrayOf(
    object({
      date: str,
      agent_id: str,
      queue_id: str,
      answered: num,
      missed: num,
      total_talk_s: num,
    }),
  ),
});

export function pbxFromWire(w: Decoded<typeof wirePbxMetrics>): PbxMetrics {
  const queueDaily: QueueDailyStat[] = w.queue_daily.map((q) => ({
    date: q.date,
    queueId: q.queue_id,
    incoming: q.incoming,
    answered: q.answered,
    missed: q.missed,
    abandoned: q.abandoned,
    totalWaitS: q.total_wait_s,
    maxWaitS: q.max_wait_s,
    totalTalkS: q.total_talk_s,
  }));
  const agentDaily: AgentDailyStat[] = w.agent_daily.map((a) => ({
    date: a.date,
    agentId: a.agent_id,
    queueId: a.queue_id,
    answered: a.answered,
    missed: a.missed,
    totalTalkS: a.total_talk_s,
  }));
  return { queueDaily, agentDaily, simulated: w.simulated };
}

export const wireLiveStatus = object({
  generated_at: str,
  simulated: bool,
  queues: arrayOf(
    object({
      queue_id: str,
      waiting: num,
      longest_wait_s: num,
      active_calls: num,
      agents_available: num,
    }),
  ),
  agents: arrayOf(
    object({
      agent_id: str,
      state: oneOf(['available', 'ringing', 'on_call', 'paused', 'offline']),
      since_s: num,
      queue_ids: arrayOf(str),
    }),
  ),
  calls: arrayOf(
    object({
      id: str,
      queue_id: str,
      agent_id: nullable(str),
      state: oneOf(['waiting', 'ringing', 'talking']),
      duration_s: num,
      caller_masked: str,
    }),
  ),
});

export function liveFromWire(w: Decoded<typeof wireLiveStatus>): LiveStatus {
  return {
    generatedAt: w.generated_at,
    simulated: w.simulated,
    queues: w.queues.map((q) => ({
      queueId: q.queue_id,
      waiting: q.waiting,
      longestWaitS: q.longest_wait_s,
      activeCalls: q.active_calls,
      agentsAvailable: q.agents_available,
    })),
    agents: w.agents.map((a) => ({
      agentId: a.agent_id,
      state: a.state,
      sinceS: a.since_s,
      queueIds: a.queue_ids,
    })),
    calls: w.calls.map((c) => ({
      id: c.id,
      queueId: c.queue_id,
      agentId: c.agent_id,
      state: c.state,
      durationS: c.duration_s,
      callerMasked: c.caller_masked,
    })),
  };
}

export const wireInsightRow = object({
  call_id: str,
  recorded_at: str,
  queue_id: nullable(str),
  agent_id: nullable(str),
  reason: oneOf(CALL_REASONS),
  complaint: bool,
  service_request: bool,
});

export function insightFromWire(w: Decoded<typeof wireInsightRow>): InsightRow {
  return {
    callId: w.call_id,
    recordedAt: w.recorded_at,
    queueId: w.queue_id,
    agentId: w.agent_id,
    reason: w.reason,
    complaint: w.complaint,
    serviceRequest: w.service_request,
  };
}

export const wireReport = object({
  id: str,
  title: str,
  period: oneOf(['weekly', 'monthly', 'yearly', 'custom']),
  from: str,
  to: str,
  queue_ids: arrayOf(str),
  agent_ids: arrayOf(str),
  created_at: str,
  created_by: str,
  email_status: oneOf(['not_sent', 'simulated_sent', 'sent']),
  simulated: bool,
});

export function reportFromWire(w: Decoded<typeof wireReport>): ReportRecord {
  return {
    id: w.id,
    title: w.title,
    period: w.period,
    range: { from: w.from, to: w.to },
    queueIds: w.queue_ids,
    agentIds: w.agent_ids,
    createdAt: w.created_at,
    createdBy: w.created_by,
    emailStatus: w.email_status,
    simulated: w.simulated,
  };
}
