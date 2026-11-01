import type {
  DeliveryKind,
  DeliveryRecord,
  EmailSender,
  EmailSenderInput,
  EmailTemplate,
  EmailTemplateInput,
  NotificationRule,
  NotificationRuleInput,
  PbxTestResult,
  ReportEmailOptions,
} from '@/shared/types/domain';
import { endpoints } from '../endpoints';
import { listOf, type Send } from '../send';
import {
  deliveryFromWire,
  reportEmailFromWire,
  reportEmailToWire,
  ruleFromWire,
  ruleInputToWire,
  senderFromWire,
  senderInputToWire,
  templateFromWire,
  templateInputToWire,
  wireDelivery,
  wireReportEmail,
  wireRule,
  wireSender,
  wireTemplate,
} from '../wire/notifications';
import { testFromWire, wirePbxTest } from '../wire/pbx';

/** Connection-test result shape (shared with PBX: per-step passed/failed/skipped). */
export type ConnectionTestResult = PbxTestResult;

/**
 * Notifications and email (PROVISIONAL routes). Mail is sent only by the backend through the
 * dedicated Microsoft 365 sender; the mock records simulated deliveries and sends nothing.
 */
export interface NotificationsApi {
  getSender(): Promise<EmailSender>;
  saveSender(input: EmailSenderInput): Promise<EmailSender>;
  testSender(): Promise<ConnectionTestResult>;
  sendTestEmail(to: string): Promise<DeliveryRecord>;
  listRules(): Promise<NotificationRule[]>;
  createRule(input: NotificationRuleInput): Promise<NotificationRule>;
  updateRule(id: string, patch: Partial<NotificationRuleInput>): Promise<NotificationRule>;
  testRule(id: string): Promise<DeliveryRecord>;
  listTemplates(): Promise<EmailTemplate[]>;
  saveTemplate(id: string, input: EmailTemplateInput): Promise<EmailTemplate>;
  getReportEmail(): Promise<ReportEmailOptions>;
  saveReportEmail(options: Omit<ReportEmailOptions, 'updatedAt'>): Promise<ReportEmailOptions>;
  listDeliveries(kind?: DeliveryKind): Promise<DeliveryRecord[]>;
}

export function createNotificationsApi(send: Send): NotificationsApi {
  const rules = listOf(wireRule, ruleFromWire);
  const templates = listOf(wireTemplate, templateFromWire);
  const deliveries = listOf(wireDelivery, deliveryFromWire);
  return {
    getSender: () =>
      send({ method: 'GET', path: endpoints.emailSender }, wireSender, senderFromWire),
    saveSender: (input) =>
      send(
        { method: 'PUT', path: endpoints.emailSender, body: senderInputToWire(input) },
        wireSender,
        senderFromWire,
      ),
    testSender: () =>
      send({ method: 'POST', path: endpoints.emailSenderTest }, wirePbxTest, testFromWire),
    sendTestEmail: (to) =>
      send(
        { method: 'POST', path: endpoints.emailSenderTestEmail, body: { to: to.trim() } },
        wireDelivery,
        deliveryFromWire,
      ),
    listRules: () =>
      send({ method: 'GET', path: endpoints.notificationRules }, rules.decoder, rules.map),
    createRule: (input) =>
      send(
        { method: 'POST', path: endpoints.notificationRules, body: ruleInputToWire(input) },
        wireRule,
        ruleFromWire,
      ),
    updateRule: (id, patch) =>
      send(
        { method: 'PATCH', path: endpoints.notificationRule(id), body: ruleInputToWire(patch) },
        wireRule,
        ruleFromWire,
      ),
    testRule: (id) =>
      send(
        { method: 'POST', path: endpoints.notificationRuleTest(id) },
        wireDelivery,
        deliveryFromWire,
      ),
    listTemplates: () =>
      send({ method: 'GET', path: endpoints.emailTemplates }, templates.decoder, templates.map),
    saveTemplate: (id, input) =>
      send(
        { method: 'PUT', path: endpoints.emailTemplate(id), body: templateInputToWire(input) },
        wireTemplate,
        templateFromWire,
      ),
    getReportEmail: () =>
      send(
        { method: 'GET', path: endpoints.reportEmailOptions },
        wireReportEmail,
        reportEmailFromWire,
      ),
    saveReportEmail: (o) =>
      send(
        { method: 'PUT', path: endpoints.reportEmailOptions, body: reportEmailToWire(o) },
        wireReportEmail,
        reportEmailFromWire,
      ),
    listDeliveries: (kind) =>
      send(
        { method: 'GET', path: endpoints.deliveries, query: { kind } },
        deliveries.decoder,
        deliveries.map,
      ),
  };
}
