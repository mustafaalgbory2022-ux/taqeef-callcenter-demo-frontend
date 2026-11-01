import type { EmailTemplateKind } from '@/shared/types/domain';

/** Email and Microsoft 365 sender rules shared by the forms and the simulated backend. */

export const EMAIL_PATTERN = /^[^\s@<>(),;:"]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
export const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_RECIPIENTS = 20;

export const isEmail = (v: string) => EMAIL_PATTERN.test(v.trim());

export const TEMPLATE_PLACEHOLDERS: Readonly<
  Record<EmailTemplateKind, { required: readonly string[]; optional: readonly string[] }>
> = {
  low_quality_alert: {
    required: ['call_id', 'agent', 'result'],
    optional: ['queue', 'recorded_at', 'threshold', 'trigger', 'link'],
  },
  management_report: {
    required: ['period'],
    optional: ['queue_summary', 'agent_summary', 'audio_sample', 'generated_at', 'link'],
  },
};

export interface TemplateCheck {
  missing: string[];
  unknown: string[];
}

/** Placeholders checked across subject and body together. */
export function checkTemplate(
  kind: EmailTemplateKind,
  subject: string,
  body: string,
): TemplateCheck {
  const used = new Set(
    [...`${subject}\n${body}`.matchAll(/\{([a-z_]+)\}/gi)].map((m) => m[1] ?? ''),
  );
  const { required, optional } = TEMPLATE_PLACEHOLDERS[kind];
  const allowed = new Set([...required, ...optional]);
  return {
    missing: required.filter((p) => !used.has(p)),
    unknown: [...used].filter((p) => !allowed.has(p)),
  };
}

/** Fill `{placeholders}`; unknown ones are left visible so mistakes are obvious in previews. */
export function renderTemplate(text: string, values: Readonly<Record<string, string>>): string {
  return text.replace(/\{([a-z_]+)\}/gi, (m, key: string) => values[key] ?? m);
}
