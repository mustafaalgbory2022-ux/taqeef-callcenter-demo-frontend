import type { MessageKey } from '@/shared/i18n/translate';
import type {
  EmailSender,
  EmailSenderInput,
  EmailTemplateInput,
  EmailTemplateKind,
  Language,
  NotificationRuleInput,
  ReportEmailOptions,
} from '@/shared/types/domain';
import { checkTemplate, GUID_PATTERN, isEmail, MAX_RECIPIENTS } from '@/shared/utils/emailRules';

type Errors<K extends string> = Partial<Record<K, MessageKey>>;

export const toSenderInput = (s: EmailSender): EmailSenderInput => ({
  senderAddress: s.senderAddress,
  displayName: s.displayName,
  tenantId: s.tenantId,
  clientId: s.clientId,
  replyTo: s.replyTo,
  secret: '',
});

export type SenderField = keyof EmailSenderInput;

export function validateSender(i: EmailSenderInput, credentialSet: boolean): Errors<SenderField> {
  const e: Errors<SenderField> = {};
  if (!isEmail(i.senderAddress)) e.senderAddress = 'notifications.errors.email';
  if (i.displayName.trim().length > 60) e.displayName = 'notifications.errors.tooLong';
  if (!GUID_PATTERN.test(i.tenantId.trim())) e.tenantId = 'notifications.errors.guid';
  if (!GUID_PATTERN.test(i.clientId.trim())) e.clientId = 'notifications.errors.guid';
  if (i.replyTo.trim() && !isEmail(i.replyTo)) e.replyTo = 'notifications.errors.email';
  if (i.secret && (i.secret.length < 8 || i.secret.length > 256))
    e.secret = 'notifications.errors.secret';
  if (!i.secret && !credentialSet) e.secret = 'notifications.errors.secretRequired';
  return e;
}

export const SENDER_SERVER_FIELD: Record<string, SenderField> = {
  sender_address: 'senderAddress',
  display_name: 'displayName',
  tenant_id: 'tenantId',
  client_id: 'clientId',
  reply_to: 'replyTo',
  client_secret: 'secret',
};

function recipientsKey(list: readonly string[], required: boolean): MessageKey | null {
  if (required && list.length === 0) return 'notifications.errors.recipientsRequired';
  if (list.length > MAX_RECIPIENTS) return 'notifications.errors.tooManyRecipients';
  if (list.some((r) => !isEmail(r))) return 'notifications.errors.recipientInvalid';
  return null;
}

export type RuleField = 'name' | 'customThreshold' | 'recipients' | 'templateId';

export function validateRule(i: NotificationRuleInput): Errors<RuleField> {
  const e: Errors<RuleField> = {};
  if (!i.name.trim() || i.name.trim().length > 60) e.name = 'notifications.errors.name';
  if (
    i.thresholdMode === 'custom' &&
    (i.customThreshold === null || !(i.customThreshold > 0 && i.customThreshold <= 10))
  )
    e.customThreshold = 'notifications.errors.threshold';
  const r = recipientsKey(i.recipients, true);
  if (r) e.recipients = r;
  if (!i.templateId) e.templateId = 'notifications.errors.template';
  return e;
}

export const RULE_SERVER_FIELD: Record<string, RuleField> = {
  name: 'name',
  custom_threshold: 'customThreshold',
  recipients: 'recipients',
  template_id: 'templateId',
};

export const emptyRule = (templateId: string): NotificationRuleInput => ({
  name: '',
  trigger: 'low_score',
  enabled: true,
  thresholdMode: 'scorecard',
  customThreshold: null,
  queueIds: [],
  recipients: [],
  delivery: 'immediate',
  templateId,
});

export type TemplateField = 'name' | 'subject' | 'body' | 'changeNote';

export function validateTemplate(
  kind: EmailTemplateKind,
  i: EmailTemplateInput,
): Errors<TemplateField> {
  const e: Errors<TemplateField> = {};
  if (!i.name.trim() || i.name.trim().length > 80) e.name = 'notifications.errors.name';
  if (!i.subject.trim() || i.subject.trim().length > 200)
    e.subject = 'notifications.errors.subject';
  if (!i.body.trim() || i.body.length > 5000) e.body = 'notifications.errors.body';
  else {
    const c = checkTemplate(kind, i.subject, i.body);
    if (c.missing.length) e.body = 'notifications.errors.placeholderMissing';
    else if (c.unknown.length) e.body = 'notifications.errors.placeholderUnknown';
  }
  if (i.changeNote.trim().length < 3) e.changeNote = 'notifications.errors.changeNote';
  return e;
}

export const TEMPLATE_SERVER_FIELD: Record<string, TemplateField> = {
  name: 'name',
  subject: 'subject',
  body: 'body',
  change_note: 'changeNote',
};

export type ReportEmailField = 'recipients' | 'cc' | 'includeQueueReport' | 'templateId';

export function validateReportEmail(
  o: Omit<ReportEmailOptions, 'updatedAt'>,
): Errors<ReportEmailField> {
  const e: Errors<ReportEmailField> = {};
  const r = recipientsKey(o.recipients, true);
  if (r) e.recipients = r;
  const cc = recipientsKey(o.cc, false);
  if (cc) e.cc = cc;
  if (!o.includeQueueReport && !o.includeAgentReport)
    e.includeQueueReport = 'notifications.errors.reportParts';
  if (!o.templateId) e.templateId = 'notifications.errors.template';
  return e;
}

export const REPORT_EMAIL_SERVER_FIELD: Record<string, ReportEmailField> = {
  recipients: 'recipients',
  cc: 'cc',
  include_queue_report: 'includeQueueReport',
  template_id: 'templateId',
};

/** Clearly synthetic values used to preview templates. */
export function previewValues(kind: EmailTemplateKind, lang: Language): Record<string, string> {
  if (kind === 'low_quality_alert') {
    return {
      call_id: 'DEMO-005',
      agent: lang === 'ar' ? 'الموظف أ (تجريبي)' : 'Agent A (synthetic)',
      result: '4.00 / 10',
      queue: lang === 'ar' ? '6002 ما بعد البيع' : '6002 After-Sales',
      recorded_at: '2026-10-24 10:12',
      threshold: '7.00',
      trigger: lang === 'ar' ? 'درجة منخفضة' : 'low score',
      link: '/calls/DEMO-005',
    };
  }
  return {
    period: '2026-10-24 – 2026-10-30',
    generated_at: '2026-10-31 09:00',
    queue_summary: '6001 Sales · 6002 After-Sales (synthetic)',
    agent_summary: 'Agents A–D (synthetic, alphabetical)',
    audio_sample: '5 recordings per agent, ≥ 60 s',
    link: '/reports',
  };
}
