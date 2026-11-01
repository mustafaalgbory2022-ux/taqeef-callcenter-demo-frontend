import type { ReportInput } from '@/shared/api/client';
import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import type {
  AudioSampleRequest,
  ReportRunRequest,
  ReportSettingsInput,
} from '@/shared/types/domain';

export const useReportHistory = () => useApiQuery(['reports'], (api) => api.listReports());
export const useSaveReport = () =>
  useApiMutation((api, input: ReportInput) => api.saveReport(input), ['reports']);
export const useEmailReport = () =>
  useApiMutation((api, id: string) => api.emailReport(id), ['reports']);
export const useAudioSample = () =>
  useApiMutation((api, req: AudioSampleRequest) => api.sampleAudio(req), []);

export const useReportSettings = () =>
  useApiQuery(['reports', 'settings'], (api) => api.reportSettings.get());
export const useSaveReportSettings = () =>
  useApiMutation((api, input: ReportSettingsInput) => api.reportSettings.save(input), ['reports']);
export const useGenerateReport = () =>
  useApiMutation(
    (api, r: ReportRunRequest) => api.reportSettings.generate(r),
    ['reports', 'notifications'],
  );
