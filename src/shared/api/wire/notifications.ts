import type {
  DeliveryRecord,
  EmailSender,
  EmailSenderInput,
  EmailTemplate,
  EmailTemplateInput,
  NotificationRule,
  NotificationRuleInput,
  ReportEmailOptions,
} from '@/shared/types/domain';
import { arrayOf, bool, nullable, num, object, oneOf, str, type Decoded } from '../decode';

/* PROVISIONAL wire shapes for the Microsoft 365 sender, notification rules and templates. */

export const wireSender = object({
  provider: oneOf(['microsoft_365']),
  sender_address: str,
  display_name: str,
  tenant_id: str,
  client_id: str,
  reply_to: str,
  credential_set: bool,
  credential_updated_at: nullable(str),
  state: oneOf(['not_configured', 'configured', 'verified', 'error']),
  state_message: str,
  checked_at: nullable(str),
  updated_at: str,
  simulated: bool,
});

export function senderFromWire(w: Decoded<typeof wireSender>): EmailSender {
  return {
    provider: w.provider,
    senderAddress: w.sender_address,
    displayName: w.display_name,
    tenantId: w.tenant_id,
    clientId: w.client_id,
    replyTo: w.reply_to,
    credentialSet: w.credential_set,
    credentialUpdatedAt: w.credential_updated_at,
    state: w.state,
    stateMessage: w.state_message,
    checkedAt: w.checked_at,
    updatedAt: w.updated_at,
    simulated: w.simulated,
  };
}

export function senderInputToWire(i: EmailSenderInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    sender_address: i.senderAddress.trim(),
    display_name: i.displayName.trim(),
    tenant_id: i.tenantId.trim(),
    client_id: i.clientId.trim(),
    reply_to: i.replyTo.trim(),
  };
  if (i.secret) body.client_secret = i.secret; // write-only
  return body;
}

export const wireRule = object({
  id: str,
  name: str,
  trigger: oneOf(['low_score', 'insufficient_evidence', 'prohibited_flag']),
  enabled: bool,
  threshold_mode: oneOf(['scorecard', 'custom']),
  custom_threshold: nullable(num),
  queue_ids: arrayOf(str),
  recipients: arrayOf(str),
  delivery: oneOf(['immediate', 'daily_digest']),
  template_id: str,
  updated_at: str,
  synthetic: bool,
});

export function ruleFromWire(w: Decoded<typeof wireRule>): NotificationRule {
  return {
    id: w.id,
    name: w.name,
    trigger: w.trigger,
    enabled: w.enabled,
    thresholdMode: w.threshold_mode,
    customThreshold: w.custom_threshold,
    queueIds: w.queue_ids,
    recipients: w.recipients,
    delivery: w.delivery,
    templateId: w.template_id,
    updatedAt: w.updated_at,
    synthetic: w.synthetic,
  };
}

export function ruleInputToWire(i: Partial<NotificationRuleInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (i.name !== undefined) out.name = i.name.trim();
  if (i.trigger !== undefined) out.trigger = i.trigger;
  if (i.enabled !== undefined) out.enabled = i.enabled;
  if (i.thresholdMode !== undefined) out.threshold_mode = i.thresholdMode;
  if (i.customThreshold !== undefined) out.custom_threshold = i.customThreshold;
  if (i.queueIds !== undefined) out.queue_ids = [...i.queueIds];
  if (i.recipients !== undefined) out.recipients = i.recipients.map((r) => r.trim());
  if (i.delivery !== undefined) out.delivery = i.delivery;
  if (i.templateId !== undefined) out.template_id = i.templateId;
  return out;
}

export const wireTemplate = object({
  id: str,
  kind: oneOf(['low_quality_alert', 'management_report']),
  name: str,
  language: oneOf(['ar', 'en']),
  subject: str,
  body: str,
  version: num,
  updated_at: str,
  updated_by: str,
});

export function templateFromWire(w: Decoded<typeof wireTemplate>): EmailTemplate {
  return {
    id: w.id,
    kind: w.kind,
    name: w.name,
    language: w.language,
    subject: w.subject,
    body: w.body,
    version: w.version,
    updatedAt: w.updated_at,
    updatedBy: w.updated_by,
  };
}

export const templateInputToWire = (i: EmailTemplateInput) => ({
  name: i.name.trim(),
  language: i.language,
  subject: i.subject.trim(),
  body: i.body,
  change_note: i.changeNote.trim(),
});

export const wireReportEmail = object({
  recipients: arrayOf(str),
  cc: arrayOf(str),
  include_queue_report: bool,
  include_agent_report: bool,
  include_audio_sample: bool,
  attach_excel: bool,
  language: oneOf(['ar', 'en', 'both']),
  template_id: str,
  updated_at: str,
});

export function reportEmailFromWire(w: Decoded<typeof wireReportEmail>): ReportEmailOptions {
  return {
    recipients: w.recipients,
    cc: w.cc,
    includeQueueReport: w.include_queue_report,
    includeAgentReport: w.include_agent_report,
    includeAudioSample: w.include_audio_sample,
    attachExcel: w.attach_excel,
    language: w.language,
    templateId: w.template_id,
    updatedAt: w.updated_at,
  };
}

export const reportEmailToWire = (o: Omit<ReportEmailOptions, 'updatedAt'>) => ({
  recipients: [...o.recipients],
  cc: [...o.cc],
  include_queue_report: o.includeQueueReport,
  include_agent_report: o.includeAgentReport,
  include_audio_sample: o.includeAudioSample,
  attach_excel: o.attachExcel,
  language: o.language,
  template_id: o.templateId,
});

export const wireDelivery = object({
  id: str,
  at: str,
  kind: oneOf(['test', 'low_quality_alert', 'management_report']),
  recipients: arrayOf(str),
  subject: str,
  status: oneOf(['simulated', 'sent', 'failed']),
  detail: str,
  related_id: nullable(str),
});

export function deliveryFromWire(w: Decoded<typeof wireDelivery>): DeliveryRecord {
  return {
    id: w.id,
    at: w.at,
    kind: w.kind,
    recipients: w.recipients,
    subject: w.subject,
    status: w.status,
    detail: w.detail,
    relatedId: w.related_id,
  };
}
