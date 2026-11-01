import type { MessageKey } from '@/shared/i18n/translate';
import type {
  Agent,
  ReportRunRequest,
  ReportSettings,
  ReportSettingsInput,
} from '@/shared/types/domain';
import { addDays, daysInRange, isValidRange, periodRange } from '@/shared/utils/dates';
import {
  CALLS_PER_AGENT_RANGE,
  MAX_REPORT_DAYS,
  MIN_DURATION_RANGE,
} from '@/shared/utils/reportRules';

export type SettingsField =
  'callsPerAgent' | 'minDurationSeconds' | 'defaultQueueIds' | 'defaultAgentIds' | 'changeNote';

const whole = (n: number, [min, max]: readonly [number, number]) =>
  Number.isInteger(n) && n >= min && n <= max;

export const toSettingsInput = (s: ReportSettings): ReportSettingsInput => ({
  callsPerAgent: s.callsPerAgent,
  minDurationSeconds: s.minDurationSeconds,
  defaultQueueIds: s.defaultQueueIds,
  agentSelection: s.agentSelection,
  defaultAgentIds: s.defaultAgentIds,
  delivery: s.delivery,
  automaticScheduling: false,
  changeNote: '',
});

export function validateReportSettings(
  i: ReportSettingsInput,
): Partial<Record<SettingsField, MessageKey>> {
  const e: Partial<Record<SettingsField, MessageKey>> = {};
  if (!whole(i.callsPerAgent, CALLS_PER_AGENT_RANGE))
    e.callsPerAgent = 'reportSettings.errors.callsPerAgent';
  if (!whole(i.minDurationSeconds, MIN_DURATION_RANGE))
    e.minDurationSeconds = 'reportSettings.errors.minDuration';
  if (i.defaultQueueIds.length === 0) e.defaultQueueIds = 'reportSettings.errors.queues';
  if (i.agentSelection === 'selected' && i.defaultAgentIds.length === 0)
    e.defaultAgentIds = 'reportSettings.errors.agents';
  if (i.changeNote.trim().length < 3) e.changeNote = 'reportSettings.errors.changeNote';
  return e;
}

export const SETTINGS_SERVER_FIELD: Record<string, SettingsField> = {
  calls_per_agent: 'callsPerAgent',
  min_duration_s: 'minDurationSeconds',
  default_queue_ids: 'defaultQueueIds',
  default_agent_ids: 'defaultAgentIds',
  change_note: 'changeNote',
};

/** The most recent complete Saturday–Friday weeks, newest first. */
export function recentWeeks(today: string, count = 8) {
  const current = periodRange('weekly', today);
  const complete = current.to <= today ? current : periodRange('weekly', addDays(current.from, -1));
  return Array.from({ length: count }, (_, i) =>
    periodRange('weekly', addDays(complete.from, -7 * i)),
  );
}

/** Agents preselected for a run: the configured list, or every active agent. */
export function defaultRunAgents(s: ReportSettings, agents: readonly Agent[]): string[] {
  const active = agents.filter((a) => a.status === 'active').map((a) => a.id);
  return s.agentSelection === 'selected'
    ? s.defaultAgentIds.filter((id) => agents.some((a) => a.id === id))
    : active;
}

export type RunError = 'range' | 'future' | 'tooLong' | 'agents' | 'queues';

export function validateRun(r: ReportRunRequest, today: string): RunError | null {
  if (!isValidRange(r.range)) return 'range';
  if (r.range.to > today) return 'future';
  if (daysInRange(r.range) > MAX_REPORT_DAYS) return 'tooLong';
  if (r.agentIds.length === 0) return 'agents';
  if (r.queueIds.length === 0) return 'queues';
  return null;
}
