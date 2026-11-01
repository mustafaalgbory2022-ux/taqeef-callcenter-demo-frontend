import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import type {
  DeliveryKind,
  EmailSenderInput,
  EmailTemplateInput,
  NotificationRuleInput,
  ReportEmailOptions,
} from '@/shared/types/domain';

const P = 'notifications';
export const useSender = () => useApiQuery([P, 'sender'], (api) => api.notifications.getSender());
export const useRules = () => useApiQuery([P, 'rules'], (api) => api.notifications.listRules());
export const useTemplates = () =>
  useApiQuery([P, 'templates'], (api) => api.notifications.listTemplates());
export const useReportEmail = () =>
  useApiQuery([P, 'reportEmail'], (api) => api.notifications.getReportEmail());
export const useDeliveries = (kind?: DeliveryKind) =>
  useApiQuery([P, 'deliveries', kind ?? 'all'], (api) => api.notifications.listDeliveries(kind));

export const useSaveSender = () =>
  useApiMutation((api, i: EmailSenderInput) => api.notifications.saveSender(i), [P]);
export const useTestSender = () => useApiMutation((api) => api.notifications.testSender(), [P]);
export const useSendTestEmail = () =>
  useApiMutation((api, to: string) => api.notifications.sendTestEmail(to), [P]);
export const useSaveRule = () =>
  useApiMutation(
    (api, a: { id: string | null; input: Partial<NotificationRuleInput> }) =>
      a.id
        ? api.notifications.updateRule(a.id, a.input)
        : api.notifications.createRule(a.input as NotificationRuleInput),
    [P],
  );
export const useTestRule = () =>
  useApiMutation((api, id: string) => api.notifications.testRule(id), [P]);
export const useSaveTemplate = () =>
  useApiMutation(
    (api, a: { id: string; input: EmailTemplateInput }) =>
      api.notifications.saveTemplate(a.id, a.input),
    [P],
  );
export const useSaveReportEmail = () =>
  useApiMutation(
    (api, o: Omit<ReportEmailOptions, 'updatedAt'>) => api.notifications.saveReportEmail(o),
    [P],
  );
