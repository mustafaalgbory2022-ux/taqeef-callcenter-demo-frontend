import {
  checkTemplate,
  EMAIL_PATTERN,
  GUID_PATTERN,
  isEmail,
  MAX_RECIPIENTS,
  renderTemplate,
} from '@/shared/utils/emailRules';
import { floorTo2 } from '@/shared/utils/score';
import { recordAudit } from '../audit';
import { nextId } from '../db';
import type { WireDelivery, WireRule, WireSender } from '../fixtures/notifications';
import { created, fail, invalid, ok, type Route } from '../router';
import type { MockState } from '../types';
import { currentByCall } from './callQueries';

const SIMULATED = 'Simulated: nothing was sent.';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

function senderReady(s: WireSender) {
  return (
    isEmail(s.sender_address) &&
    GUID_PATTERN.test(s.tenant_id) &&
    GUID_PATTERN.test(s.client_id) &&
    s.credential_set
  );
}

function recipientsError(field: string, list: unknown, required: boolean) {
  if (!Array.isArray(list)) return invalid(field, 'Enter a list of addresses.');
  if (required && list.length === 0) return invalid(field, 'Enter at least one recipient.');
  if (list.length > MAX_RECIPIENTS)
    return invalid(field, `Use at most ${MAX_RECIPIENTS} recipients.`);
  const bad = list.find((r) => typeof r !== 'string' || !EMAIL_PATTERN.test(r.trim()));
  return bad === undefined ? null : invalid(field, `Invalid email address: ${String(bad)}`);
}

export function recordDelivery(
  state: MockState,
  d: Omit<WireDelivery, 'id' | 'at' | 'status'>,
): WireDelivery {
  const record: WireDelivery = {
    ...d,
    id: nextId(state, 'dlv'),
    at: new Date().toISOString(),
    status: 'simulated',
  };
  state.notifications.deliveries.unshift(record);
  return record;
}

export function notificationRoutes(state: MockState, persist: () => void): Route[] {
  const n = state.notifications;

  function validateRule(b: Record<string, unknown>, partial: boolean) {
    const has = (k: string) => !partial || b[k] !== undefined;
    if (has('name') && (!str(b.name) || str(b.name).length > 60))
      return invalid('name', 'Enter a name of up to 60 characters.');
    if (
      has('trigger') &&
      !['low_score', 'insufficient_evidence', 'prohibited_flag'].includes(String(b.trigger))
    )
      return invalid('trigger', 'Choose a trigger.');
    if (has('threshold_mode')) {
      if (b.threshold_mode !== 'scorecard' && b.threshold_mode !== 'custom')
        return invalid('threshold_mode', 'Invalid mode.');
      if (b.threshold_mode === 'custom') {
        const v = b.custom_threshold;
        if (typeof v !== 'number' || v <= 0 || v > 10)
          return invalid('custom_threshold', 'Enter a threshold above 0 and up to 10.');
      }
    }
    if (has('queue_ids')) {
      const known = new Set(state.queues.map((q) => q.id));
      if (!Array.isArray(b.queue_ids) || b.queue_ids.some((q) => !known.has(String(q))))
        return invalid('queue_ids', 'Unknown queue.');
    }
    if (has('recipients')) {
      const e = recipientsError('recipients', b.recipients, true);
      if (e) return e;
    }
    if (has('delivery') && b.delivery !== 'immediate' && b.delivery !== 'daily_digest')
      return invalid('delivery', 'Invalid delivery.');
    if (
      has('template_id') &&
      !n.templates.some((t) => t.id === b.template_id && t.kind === 'low_quality_alert')
    )
      return invalid('template_id', 'Choose a low-quality alert template.');
    return null;
  }

  return [
    { method: 'GET', pattern: '/notifications/sender', handler: () => ok(n.sender) },
    {
      method: 'PUT',
      pattern: '/notifications/sender',
      handler: ({ body }) => {
        const b = (body ?? {}) as Record<string, unknown>;
        const address = str(b.sender_address);
        if (!isEmail(address))
          return invalid('sender_address', 'Enter the dedicated sender mailbox address.');
        if (str(b.display_name).length > 60)
          return invalid('display_name', 'Use at most 60 characters.');
        if (!GUID_PATTERN.test(str(b.tenant_id)))
          return invalid('tenant_id', 'Enter the directory (tenant) ID as a GUID.');
        if (!GUID_PATTERN.test(str(b.client_id)))
          return invalid('client_id', 'Enter the application (client) ID as a GUID.');
        if (str(b.reply_to) && !isEmail(str(b.reply_to)))
          return invalid('reply_to', 'Enter a valid reply-to address.');
        const secret = typeof b.client_secret === 'string' ? b.client_secret : '';
        if (secret && (secret.length < 8 || secret.length > 256))
          return invalid('client_secret', 'The client secret must be 8–256 characters.');
        if (!secret && !n.sender.credential_set)
          return invalid('client_secret', 'Enter the client secret.');
        const before = { ...n.sender };
        const now = new Date().toISOString();
        Object.assign(n.sender, {
          sender_address: address,
          display_name: str(b.display_name),
          tenant_id: str(b.tenant_id),
          client_id: str(b.client_id),
          reply_to: str(b.reply_to),
          updated_at: now,
          state: 'configured',
          state_message:
            'Simulated: settings are valid; no connection to Microsoft 365 is made in the browser.',
        });
        if (secret) {
          n.sender.credential_set = true;
          n.sender.credential_updated_at = now;
          recordAudit(state, {
            resource: 'email_sender',
            resourceId: null,
            action: 'credential_replaced',
            summary: 'Client secret replaced (value not recorded)',
          });
        }
        const changes = (
          ['sender_address', 'display_name', 'tenant_id', 'client_id', 'reply_to'] as const
        ).flatMap((k) =>
          before[k] === n.sender[k]
            ? []
            : [{ field: k, before: before[k] || null, after: n.sender[k] }],
        );
        if (changes.length)
          recordAudit(state, {
            resource: 'email_sender',
            resourceId: null,
            action: 'updated',
            summary: 'Microsoft 365 sender updated',
            changes,
          });
        persist();
        return ok(n.sender);
      },
    },
    {
      method: 'POST',
      pattern: '/notifications/sender/test-connection',
      handler: () => {
        const s = n.sender;
        const settingsOk =
          isEmail(s.sender_address) &&
          GUID_PATTERN.test(s.tenant_id) &&
          GUID_PATTERN.test(s.client_id);
        const steps = [
          {
            step: 'settings',
            result: settingsOk ? 'passed' : 'failed',
            message: settingsOk ? 'Sender settings are valid.' : 'Sender settings are incomplete.',
          },
          {
            step: 'credentials',
            result: s.credential_set ? 'passed' : 'failed',
            message: s.credential_set
              ? 'A client secret is stored.'
              : 'No client secret is stored.',
          },
          {
            step: 'network',
            result: 'skipped',
            message: 'Simulated backend: Microsoft 365 was not contacted.',
          },
        ] as const;
        const passed = steps.every((x) => x.result !== 'failed');
        s.checked_at = new Date().toISOString();
        if (!passed) {
          s.state = settingsOk ? 'error' : 'not_configured';
          s.state_message = 'The last connection test failed.';
        }
        recordAudit(state, {
          resource: 'email_sender',
          resourceId: null,
          action: 'tested',
          summary: passed ? 'Sender test passed (simulated)' : 'Sender test failed (simulated)',
        });
        persist();
        return ok({ ok: passed, simulated: true, checked_at: s.checked_at, steps });
      },
    },
    {
      method: 'POST',
      pattern: '/notifications/sender/test-email',
      handler: ({ body }) => {
        const to = str((body as { to?: unknown } | null)?.to);
        if (!isEmail(to)) return invalid('to', 'Enter a valid recipient address.');
        if (!senderReady(n.sender))
          return fail(409, 'Configure the Microsoft 365 sender before sending a test email.');
        const d = recordDelivery(state, {
          kind: 'test',
          recipients: [to],
          subject: 'Test email from Call Center AI',
          detail: SIMULATED,
          related_id: null,
        });
        persist();
        return created(d);
      },
    },
    { method: 'GET', pattern: '/notifications/rules', handler: () => ok(n.rules) },
    {
      method: 'POST',
      pattern: '/notifications/rules',
      handler: ({ body }) => {
        const b = (body ?? {}) as Record<string, unknown>;
        const error = validateRule(b, false);
        if (error) return error;
        const rule: WireRule = {
          id: nextId(state, 'rule'),
          name: str(b.name),
          trigger: b.trigger as WireRule['trigger'],
          enabled: b.enabled !== false,
          threshold_mode: b.threshold_mode as WireRule['threshold_mode'],
          custom_threshold: b.threshold_mode === 'custom' ? (b.custom_threshold as number) : null,
          queue_ids: (b.queue_ids as unknown[]).map(String),
          recipients: (b.recipients as string[]).map((r) => r.trim()),
          delivery: b.delivery as WireRule['delivery'],
          template_id: String(b.template_id),
          updated_at: new Date().toISOString(),
          synthetic: true,
        };
        n.rules.push(rule);
        recordAudit(state, {
          resource: 'notification_rule',
          resourceId: rule.id,
          action: 'created',
          summary: `Rule “${rule.name}” created`,
        });
        persist();
        return created(rule);
      },
    },
    {
      method: 'PATCH',
      pattern: '/notifications/rules/:id',
      handler: ({ params, body }) => {
        const rule = n.rules.find((r) => r.id === params.id);
        if (!rule) return fail(404, 'Rule not found.');
        const b = (body ?? {}) as Record<string, unknown>;
        const merged = { ...rule, ...b };
        const error = validateRule(merged, false);
        if (error) return error;
        const before = { ...rule };
        Object.assign(rule, {
          name: str(merged.name),
          trigger: merged.trigger,
          enabled: merged.enabled === true,
          threshold_mode: merged.threshold_mode,
          custom_threshold: merged.threshold_mode === 'custom' ? merged.custom_threshold : null,
          queue_ids: (merged.queue_ids as unknown[]).map(String),
          recipients: (merged.recipients as string[]).map((r) => r.trim()),
          delivery: merged.delivery,
          template_id: String(merged.template_id),
          updated_at: new Date().toISOString(),
        });
        const keys = [
          'name',
          'trigger',
          'enabled',
          'threshold_mode',
          'custom_threshold',
          'queue_ids',
          'recipients',
          'delivery',
          'template_id',
        ] as const;
        const changes = keys.flatMap((k) =>
          String(before[k]) === String(rule[k])
            ? []
            : [{ field: k, before: String(before[k]), after: String(rule[k]) }],
        );
        if (changes.length === 0) return ok(rule);
        const toggled = changes.length === 1 && changes[0]?.field === 'enabled';
        recordAudit(state, {
          resource: 'notification_rule',
          resourceId: rule.id,
          action: toggled ? (rule.enabled ? 'enabled' : 'disabled') : 'updated',
          summary: `Rule “${rule.name}” ${toggled ? (rule.enabled ? 'enabled' : 'disabled') : 'updated'}`,
          changes,
        });
        persist();
        return ok(rule);
      },
    },
    {
      method: 'POST',
      pattern: '/notifications/rules/:id/test',
      handler: ({ params }) => {
        const rule = n.rules.find((r) => r.id === params.id);
        if (!rule) return fail(404, 'Rule not found.');
        const template = n.templates.find((t) => t.id === rule.template_id);
        if (!template) return fail(409, 'The rule template no longer exists.');
        // Find the most recent call that would have triggered this rule (synthetic data).
        const current = [...currentByCall(state).values()].sort((a, b) =>
          b.created_at.localeCompare(a.created_at),
        );
        const match = current.find((ev) => {
          const call = state.calls.find((c) => c.id === ev.call_id);
          if (!call || (rule.queue_ids.length > 0 && !rule.queue_ids.includes(call.queue_id ?? '')))
            return false;
          if (rule.trigger === 'insufficient_evidence')
            return ev.outcome === 'insufficient_evidence';
          if (rule.trigger === 'prohibited_flag')
            return ev.prohibited_hits.some((h) => h.disposition === 'flagged_for_review');
          const sc = state.scorecards.find((v) => v.version === ev.scorecard_version);
          const threshold =
            rule.threshold_mode === 'custom'
              ? (rule.custom_threshold ?? 0)
              : (sc?.low_score_threshold ?? 7);
          return (
            ev.outcome === 'scored' && ev.overall_score !== null && ev.overall_score < threshold
          );
        });
        if (!match) return fail(409, 'No synthetic call currently matches this rule.');
        const call = state.calls.find((c) => c.id === match.call_id);
        const agent = state.agents.find((a) => a.id === match.agent_id);
        const queue = state.queues.find((q) => q.id === call?.queue_id);
        const sc = state.scorecards.find((v) => v.version === match.scorecard_version);
        const result =
          match.overall_score === null
            ? 'No score'
            : `${floorTo2(match.overall_score).toFixed(2)} / 10`;
        const values = {
          call_id: match.call_id,
          agent: agent?.display_name ?? '—',
          result,
          queue: queue ? `${queue.number} ${queue.name.en}` : '—',
          recorded_at: call?.recorded_at ?? '',
          threshold: String(
            rule.threshold_mode === 'custom'
              ? rule.custom_threshold
              : (sc?.low_score_threshold ?? 7),
          ),
          trigger: rule.trigger,
          link: `/calls/${match.call_id}`,
        };
        const d = recordDelivery(state, {
          kind: 'low_quality_alert',
          recipients: rule.recipients,
          subject: renderTemplate(template.subject, values),
          detail: senderReady(n.sender)
            ? `Test of rule “${rule.name}”. ${SIMULATED}`
            : `Test of rule “${rule.name}”. ${SIMULATED} The sender is not configured.`,
          related_id: match.call_id,
        });
        persist();
        return created(d);
      },
    },
    { method: 'GET', pattern: '/notifications/templates', handler: () => ok(n.templates) },
    {
      method: 'PUT',
      pattern: '/notifications/templates/:id',
      handler: ({ params, body }) => {
        const tpl = n.templates.find((t) => t.id === params.id);
        if (!tpl) return fail(404, 'Template not found.');
        const b = (body ?? {}) as Record<string, unknown>;
        const name = str(b.name);
        const subject = str(b.subject);
        const text = typeof b.body === 'string' ? b.body : '';
        if (!name || name.length > 80)
          return invalid('name', 'Enter a name of up to 80 characters.');
        if (b.language !== 'ar' && b.language !== 'en')
          return invalid('language', 'Choose a language.');
        if (!subject || subject.length > 200)
          return invalid('subject', 'Enter a subject of up to 200 characters.');
        if (!text.trim() || text.length > 5000)
          return invalid('body', 'Enter a body of up to 5,000 characters.');
        const check = checkTemplate(tpl.kind, subject, text);
        if (check.missing.length)
          return invalid('body', `Missing placeholder: {${check.missing.join('}, {')}}.`);
        if (check.unknown.length)
          return invalid('body', `Unknown placeholder: {${check.unknown.join('}, {')}}.`);
        if (str(b.change_note).length < 3) return invalid('change_note', 'Describe the change.');
        if (
          name === tpl.name &&
          subject === tpl.subject &&
          text === tpl.body &&
          b.language === tpl.language
        )
          return fail(409, 'No changes compared with the current version.');
        const changes = [
          ...(name !== tpl.name ? [{ field: 'name', before: tpl.name, after: name }] : []),
          ...(subject !== tpl.subject
            ? [{ field: 'subject', before: tpl.subject, after: subject }]
            : []),
          ...(text !== tpl.body ? [{ field: 'body', before: 'previous', after: 'changed' }] : []),
        ];
        Object.assign(tpl, {
          name,
          subject,
          body: text,
          language: b.language,
          version: tpl.version + 1,
          updated_at: new Date().toISOString(),
          updated_by: 'Synthetic administrator',
        });
        recordAudit(state, {
          resource: 'email_template',
          resourceId: tpl.id,
          action: 'version_saved',
          summary: `“${tpl.name}” v${tpl.version}: ${str(b.change_note)}`,
          changes,
        });
        persist();
        return ok(tpl);
      },
    },
    { method: 'GET', pattern: '/notifications/report-email', handler: () => ok(n.reportEmail) },
    {
      method: 'PUT',
      pattern: '/notifications/report-email',
      handler: ({ body }) => {
        const b = (body ?? {}) as Record<string, unknown>;
        const e =
          recipientsError('recipients', b.recipients, true) ?? recipientsError('cc', b.cc, false);
        if (e) return e;
        if (!['ar', 'en', 'both'].includes(String(b.language)))
          return invalid('language', 'Choose a language.');
        if (!n.templates.some((t) => t.id === b.template_id && t.kind === 'management_report'))
          return invalid('template_id', 'Choose a management report template.');
        const flags = [
          'include_queue_report',
          'include_agent_report',
          'include_audio_sample',
          'attach_excel',
        ] as const;
        if (flags.some((f) => typeof b[f] !== 'boolean'))
          return invalid('include_queue_report', 'Invalid option.');
        if (!b.include_queue_report && !b.include_agent_report)
          return invalid('include_queue_report', 'Include at least the queue or the agent report.');
        const before = { ...n.reportEmail };
        Object.assign(n.reportEmail, {
          recipients: (b.recipients as string[]).map((r) => r.trim()),
          cc: (b.cc as string[]).map((r) => r.trim()),
          language: b.language,
          template_id: b.template_id,
          ...Object.fromEntries(flags.map((f) => [f, b[f]])),
          updated_at: new Date().toISOString(),
        });
        const keys = ['recipients', 'cc', 'language', 'template_id', ...flags] as const;
        recordAudit(state, {
          resource: 'report_email',
          resourceId: null,
          action: 'updated',
          summary: 'Management report email options updated',
          changes: keys.flatMap((k) =>
            String(before[k]) === String(n.reportEmail[k])
              ? []
              : [{ field: k, before: String(before[k]), after: String(n.reportEmail[k]) }],
          ),
        });
        persist();
        return ok(n.reportEmail);
      },
    },
    {
      method: 'GET',
      pattern: '/notifications/deliveries',
      handler: ({ query }) => ok(n.deliveries.filter((d) => !query.kind || d.kind === query.kind)),
    },
  ];
}

/** Used by the report email route: record a simulated management report delivery. */
export function recordReportDelivery(
  state: MockState,
  reportId: string,
  title: string,
  period: string,
) {
  const n = state.notifications;
  const tpl = n.templates.find((t) => t.id === n.reportEmail.template_id);
  return recordDelivery(state, {
    kind: 'management_report',
    recipients: [...n.reportEmail.recipients, ...n.reportEmail.cc],
    subject: tpl ? renderTemplate(tpl.subject, { period }) : title,
    detail: senderReady(n.sender)
      ? SIMULATED
      : `${SIMULATED} The Microsoft 365 sender is not configured.`,
    related_id: reportId,
  });
}
