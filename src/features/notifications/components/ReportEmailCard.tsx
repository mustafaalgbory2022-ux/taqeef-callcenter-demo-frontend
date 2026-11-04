import { useState, type FormEvent } from 'react';
import { focusFirstInvalid } from '@/shared/ui/focusInvalid';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { EmailTemplate, ReportEmailOptions } from '@/shared/types/domain';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Checkbox, Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { splitList } from '@/shared/utils/arabic';
import { useSaveReportEmail } from '../hooks/useNotifications';
import {
  REPORT_EMAIL_SERVER_FIELD,
  validateReportEmail,
  type ReportEmailField,
} from '../model/notifications';

type Flag = 'includeQueueReport' | 'includeAgentReport' | 'includeAudioSample' | 'attachExcel';
const FLAGS: readonly Flag[] = [
  'includeQueueReport',
  'includeAgentReport',
  'includeAudioSample',
  'attachExcel',
];

/** Recipients, content and template for the combined management report email. */
export function ReportEmailCard({
  options,
  templates,
}: {
  options: ReportEmailOptions;
  templates: readonly EmailTemplate[];
}) {
  const { t } = useI18n();
  const toast = useToast();
  const canManage = usePermission('notifications.manage');
  const save = useSaveReportEmail();
  const [v, setV] = useState(options);
  const [recipients, setRecipients] = useState(options.recipients.join(', '));
  const [cc, setCc] = useState(options.cc.join(', '));
  const [errors, setErrors] = useState<Partial<Record<ReportEmailField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    e.preventDefault();
    setFormError(null);
    const input = { ...v, recipients: splitList(recipients), cc: splitList(cc) };
    const client = validateReportEmail(input);
    setErrors(Object.fromEntries(Object.entries(client).map(([k, key]) => [k, t(key)])));
    if (Object.keys(client).length > 0) {
      focusFirstInvalid(form);
      return;
    }
    try {
      await save.mutate(input);
      toast('success', t('notifications.reportEmail.saved'));
    } catch (err) {
      const mapped = mapFieldIssues(err, REPORT_EMAIL_SERVER_FIELD);
      if (mapped) setErrors(mapped.fields);
      focusFirstInvalid(form);
      if (!mapped || mapped.unmapped.length > 0)
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
    }
  }

  return (
    <Card
      title={t('notifications.reportEmail.title')}
      caption={t('notifications.reportEmail.caption')}
    >
      <form
        onSubmit={submit}
        noValidate
        className={layout.form}
        aria-label={t('notifications.reportEmail.title')}
      >
        <fieldset disabled={!canManage} className={`${layout.form} ${layout.bare}`}>
          <div className={layout.row}>
            <Field
              label={t('notifications.reportEmail.recipients')}
              hint={t('notifications.rules.recipientsHint')}
              required
              error={errors.recipients}
            >
              {(p) => (
                <input
                  {...p}
                  dir="ltr"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                />
              )}
            </Field>
            <Field label={t('notifications.reportEmail.cc')} error={errors.cc}>
              {(p) => <input {...p} dir="ltr" value={cc} onChange={(e) => setCc(e.target.value)} />}
            </Field>
          </div>
          <fieldset className={layout.checks}>
            <legend>{t('notifications.reportEmail.content')}</legend>
            {FLAGS.map((f) => (
              <Checkbox key={f} checked={v[f]} onChange={(on) => setV((x) => ({ ...x, [f]: on }))}>
                {t(`notifications.reportEmail.flags.${f}`)}
              </Checkbox>
            ))}
            {errors.includeQueueReport && (
              <Notice tone="danger" title={errors.includeQueueReport} />
            )}
          </fieldset>
          <div className={layout.row}>
            <Field label={t('notifications.reportEmail.language')}>
              {(p) => (
                <select
                  {...p}
                  value={v.language}
                  onChange={(e) =>
                    setV((x) => ({
                      ...x,
                      language: e.target.value as ReportEmailOptions['language'],
                    }))
                  }
                >
                  <option value="both">{t('notifications.reportEmail.languages.both')}</option>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              )}
            </Field>
            <Field label={t('notifications.rules.template')} required error={errors.templateId}>
              {(p) => (
                <select
                  {...p}
                  value={v.templateId}
                  onChange={(e) => setV((x) => ({ ...x, templateId: e.target.value }))}
                >
                  {templates
                    .filter((x) => x.kind === 'management_report')
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </select>
              )}
            </Field>
          </div>
        </fieldset>
        <Notice tone="info">{t('notifications.reportEmail.noSchedule')}</Notice>
        {formError && <Notice tone="danger" title={formError} />}
        {canManage && (
          <div className={layout.actions}>
            <Button variant="primary" type="submit" loading={save.isPending}>
              {t('notifications.reportEmail.save')}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}
