import type {
  ReportRun,
  ReportRunRequest,
  ReportSettings,
  ReportSettingsInput,
} from '@/shared/types/domain';
import { endpoints } from '../endpoints';
import type { Send } from '../send';
import {
  reportRunFromWire,
  reportSettingsFromWire,
  reportSettingsToWire,
  wireReportRun,
  wireReportSettings,
} from '../wire/reportSettings';

/**
 * Report configuration and manual generation (PROVISIONAL routes). Reports are generated only
 * on request; the backend rejects automatic scheduling until it is authorized.
 */
export interface ReportSettingsApi {
  get(): Promise<ReportSettings>;
  save(input: ReportSettingsInput): Promise<ReportSettings>;
  generate(request: ReportRunRequest): Promise<ReportRun>;
}

export function createReportSettingsApi(send: Send): ReportSettingsApi {
  return {
    get: () =>
      send(
        { method: 'GET', path: endpoints.reportSettings },
        wireReportSettings,
        reportSettingsFromWire,
      ),
    save: (input) =>
      send(
        { method: 'PUT', path: endpoints.reportSettings, body: reportSettingsToWire(input) },
        wireReportSettings,
        reportSettingsFromWire,
      ),
    generate: (r) =>
      send(
        {
          method: 'POST',
          path: endpoints.reportGenerate,
          body: {
            period: r.period,
            from: r.range.from,
            to: r.range.to,
            agent_ids: [...r.agentIds],
            queue_ids: [...r.queueIds],
            deliver: r.deliver,
          },
        },
        wireReportRun,
        reportRunFromWire,
      ),
  };
}
