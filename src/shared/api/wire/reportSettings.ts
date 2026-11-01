import type { ReportRun, ReportSettings, ReportSettingsInput } from '@/shared/types/domain';
import {
  arrayOf,
  bool,
  DecodeError,
  nullable,
  num,
  object,
  oneOf,
  str,
  type Decoded,
  type Decoder,
} from '../decode';
import { callFromWire, wireCall } from './calls';
import { deliveryFromWire, wireDelivery } from './notifications';
import { reportFromWire, wireReport } from './operations';

/* PROVISIONAL wire shapes for report configuration and manual report generation. */

/** Samples contain answered calls only; anything else is a contract violation. */
const alwaysTrue: Decoder<true> = (v, path = '') => {
  if (v !== true) throw new DecodeError(path, 'true');
  return true;
};

export const wireReportSettings = object({
  version: num,
  calls_per_agent: num,
  min_duration_s: num,
  answered_only: alwaysTrue,
  default_queue_ids: arrayOf(str),
  agent_selection: oneOf(['all_active', 'selected']),
  default_agent_ids: arrayOf(str),
  delivery: oneOf(['download_only', 'email_on_generate']),
  automatic_scheduling: bool,
  scheduling_authorized: bool,
  updated_at: str,
  updated_by: str,
});

export function reportSettingsFromWire(w: Decoded<typeof wireReportSettings>): ReportSettings {
  return {
    version: w.version,
    callsPerAgent: w.calls_per_agent,
    minDurationSeconds: w.min_duration_s,
    answeredOnly: w.answered_only,
    defaultQueueIds: w.default_queue_ids,
    agentSelection: w.agent_selection,
    defaultAgentIds: w.default_agent_ids,
    delivery: w.delivery,
    automaticScheduling: w.automatic_scheduling,
    schedulingAuthorized: w.scheduling_authorized,
    updatedAt: w.updated_at,
    updatedBy: w.updated_by,
  };
}

export const reportSettingsToWire = (i: ReportSettingsInput) => ({
  calls_per_agent: i.callsPerAgent,
  min_duration_s: i.minDurationSeconds,
  default_queue_ids: [...i.defaultQueueIds],
  agent_selection: i.agentSelection,
  default_agent_ids: i.agentSelection === 'selected' ? [...i.defaultAgentIds] : [],
  delivery: i.delivery,
  automatic_scheduling: i.automaticScheduling,
  change_note: i.changeNote.trim(),
});

export const wireReportRun = object({
  report: wireReport,
  sample: object({
    seed: str,
    simulated: bool,
    agents: arrayOf(
      object({ agent_id: str, requested: num, eligible: num, calls: arrayOf(wireCall) }),
    ),
  }),
  delivery: nullable(wireDelivery),
  settings_version: num,
});

export function reportRunFromWire(w: Decoded<typeof wireReportRun>): ReportRun {
  return {
    report: reportFromWire(w.report),
    sample: {
      seed: w.sample.seed,
      simulated: w.sample.simulated,
      agents: w.sample.agents.map((a) => ({
        agentId: a.agent_id,
        requested: a.requested,
        eligible: a.eligible,
        calls: a.calls.map(callFromWire),
      })),
    },
    delivery: w.delivery ? deliveryFromWire(w.delivery) : null,
    settingsVersion: w.settings_version,
  };
}
