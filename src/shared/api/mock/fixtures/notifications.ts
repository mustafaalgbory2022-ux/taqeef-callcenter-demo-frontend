import type { Decoded } from '../../decode';
import type {
  wireDelivery,
  wireReportEmail,
  wireRule,
  wireSender,
  wireTemplate,
} from '../../wire/notifications';

export type WireSender = Decoded<typeof wireSender>;
export type WireRule = Decoded<typeof wireRule>;
export type WireTemplate = Decoded<typeof wireTemplate>;
export type WireReportEmail = Decoded<typeof wireReportEmail>;
export type WireDelivery = Decoded<typeof wireDelivery>;

const AT = '2026-09-15T09:00:00+03:00';

/** The sender starts NOT CONFIGURED: no mailbox, tenant or secret is invented. */
export const initialSender: WireSender = {
  provider: 'microsoft_365',
  sender_address: '',
  display_name: '',
  tenant_id: '',
  client_id: '',
  reply_to: '',
  credential_set: false,
  credential_updated_at: null,
  state: 'not_configured',
  state_message: 'Enter the dedicated Microsoft 365 sender mailbox and app registration.',
  checked_at: null,
  updated_at: AT,
  simulated: true,
};

/** Synthetic recipients use the reserved, non-deliverable `.invalid` domain (RFC 2606). */
export const templates: WireTemplate[] = [
  {
    id: 'tpl-alert-en',
    kind: 'low_quality_alert',
    name: 'Low-quality alert (English)',
    language: 'en',
    subject: 'Quality alert: call {call_id} — {result}',
    body:
      'Call {call_id} handled by {agent} in queue {queue} on {recorded_at} needs attention.\n' +
      'Result: {result} (threshold {threshold}).\n\nOpen the call: {link}',
    version: 1,
    updated_at: AT,
    updated_by: 'Synthetic administrator',
  },
  {
    id: 'tpl-alert-ar',
    kind: 'low_quality_alert',
    name: 'تنبيه جودة منخفضة (عربي)',
    language: 'ar',
    subject: 'تنبيه جودة: المكالمة {call_id} — {result}',
    body:
      'تحتاج المكالمة {call_id} التي تعامل معها {agent} في الطابور {queue} بتاريخ {recorded_at} إلى متابعة.\n' +
      'النتيجة: {result} (الحد {threshold}).\n\nفتح المكالمة: {link}',
    version: 1,
    updated_at: AT,
    updated_by: 'Synthetic administrator',
  },
  {
    id: 'tpl-report',
    kind: 'management_report',
    name: 'Management report',
    language: 'en',
    subject: 'Call center report — {period}',
    body:
      'Management report for {period} (generated {generated_at}).\n\nQueues:\n{queue_summary}\n\n' +
      'Agents:\n{agent_summary}\n\nRecording sample:\n{audio_sample}',
    version: 1,
    updated_at: AT,
    updated_by: 'Synthetic administrator',
  },
];

export const rules: WireRule[] = [
  {
    id: 'rule-low',
    name: 'Low score alert',
    trigger: 'low_score',
    enabled: true,
    threshold_mode: 'scorecard',
    custom_threshold: null,
    queue_ids: [],
    recipients: ['quality.supervisors@example.invalid'],
    delivery: 'immediate',
    template_id: 'tpl-alert-en',
    updated_at: AT,
    synthetic: true,
  },
  {
    id: 'rule-flag',
    name: 'Prohibited expression flagged',
    trigger: 'prohibited_flag',
    enabled: false,
    threshold_mode: 'scorecard',
    custom_threshold: null,
    queue_ids: ['q-6002'],
    recipients: ['after-sales.lead@example.invalid'],
    delivery: 'daily_digest',
    template_id: 'tpl-alert-ar',
    updated_at: AT,
    synthetic: true,
  },
];

export const reportEmail: WireReportEmail = {
  recipients: ['management@example.invalid'],
  cc: [],
  include_queue_report: true,
  include_agent_report: true,
  include_audio_sample: true,
  attach_excel: true,
  language: 'both',
  template_id: 'tpl-report',
  updated_at: AT,
};

export const deliveries: WireDelivery[] = [
  {
    id: 'dlv-seed-1',
    at: '2026-10-28T09:05:00+03:00',
    kind: 'low_quality_alert',
    recipients: ['quality.supervisors@example.invalid'],
    subject: 'Quality alert: call DEMO-005 — 4.00 / 10',
    status: 'simulated',
    detail: 'Simulated: nothing was sent.',
    related_id: 'DEMO-005',
  },
];
