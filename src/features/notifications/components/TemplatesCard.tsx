import { useState, type FormEvent } from 'react';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { useAdminAudit } from '@/shared/hooks/useAdminAudit';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { EmailTemplate, EmailTemplateInput, Language } from '@/shared/types/domain';
import { AuditTrail } from '@/shared/ui/AuditTrail';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Dialog } from '@/shared/ui/Dialog';
import { Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { useToast } from '@/shared/ui/Toaster';
import { checkTemplate, renderTemplate, TEMPLATE_PLACEHOLDERS } from '@/shared/utils/emailRules';
import { useSaveTemplate } from '../hooks/useNotifications';
import {
  previewValues,
  TEMPLATE_SERVER_FIELD,
  validateTemplate,
  type TemplateField,
} from '../model/notifications';

/** Email templates for alerts and management reports, each save a new version. */
export function TemplatesCard({ templates }: { templates: readonly EmailTemplate[] }) {
  const { t, fmt } = useI18n();
  const canManage = usePermission('notifications.manage');
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const audit = useAdminAudit('notifications', 'email_template');
  return (
    <Card
      title={t('notifications.templates.title')}
      caption={t('notifications.templates.caption')}
      flush
    >
      <TableRegion label={t('notifications.templates.title')}>
        <thead>
          <tr>
            <th scope="col">{t('notifications.templates.name')}</th>
            <th scope="col">{t('notifications.templates.kind')}</th>
            <th scope="col">{t('notifications.templates.subject')}</th>
            <th scope="col">{t('dictionary.table.version')}</th>
            <th scope="col">
              <span className="visually-hidden">{t('common.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {templates.map((tpl) => (
            <tr key={tpl.id}>
              <td className={tableStyles.wrap} lang={tpl.language} dir="auto">
                {tpl.name}
              </td>
              <td>{t(`notifications.templateKinds.${tpl.kind}`)}</td>
              <td className={tableStyles.wrap} lang={tpl.language} dir="auto">
                {tpl.subject}
              </td>
              <td className={tableStyles.muted}>
                <bdi>v{tpl.version}</bdi> · <bdi>{fmt.date(tpl.updatedAt)}</bdi>
              </td>
              <td>
                {canManage && (
                  <Button variant="ghost" size="sm" icon="edit" onClick={() => setEditing(tpl)}>
                    {t('common.edit')}
                    <span className="visually-hidden"> — {tpl.name}</span>
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </TableRegion>
      <div className={layout.toolbar}>
        <div className={layout.stack}>
          <strong>{t('notifications.templates.history')}</strong>
          <AuditTrail query={audit} limit={4} />
        </div>
      </div>
      {editing && <TemplateDialog template={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function TemplateDialog({ template, onClose }: { template: EmailTemplate; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const save = useSaveTemplate();
  const [v, setV] = useState<EmailTemplateInput>({
    name: template.name,
    language: template.language,
    subject: template.subject,
    body: template.body,
    changeNote: '',
  });
  const [errors, setErrors] = useState<Partial<Record<TemplateField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const check = checkTemplate(template.kind, v.subject, v.body);
  const values = previewValues(template.kind, v.language);
  const { required, optional } = TEMPLATE_PLACEHOLDERS[template.kind];
  const set = <K extends keyof EmailTemplateInput>(k: K, value: EmailTemplateInput[K]) =>
    setV((x) => ({ ...x, [k]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const client = validateTemplate(template.kind, v);
    setErrors(Object.fromEntries(Object.entries(client).map(([k, key]) => [k, t(key)])));
    if (Object.keys(client).length > 0) return;
    try {
      const saved = await save.mutate({ id: template.id, input: v });
      toast('success', t('notifications.templates.saved', { v: saved.version }));
      onClose();
    } catch (err) {
      const mapped = mapFieldIssues(err, TEMPLATE_SERVER_FIELD);
      if (mapped) setErrors(mapped.fields);
      if (!mapped || mapped.unmapped.length > 0)
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
    }
  }

  return (
    <Dialog
      open
      title={t('notifications.templates.editTitle', { name: template.name })}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit" form="template-form" loading={save.isPending}>
            {t('aiAdmin.form.save', { v: template.version + 1 })}
          </Button>
        </>
      }
    >
      <form id="template-form" onSubmit={submit} noValidate className={layout.form}>
        <div className={layout.row}>
          <Field label={t('notifications.templates.name')} required error={errors.name}>
            {(p) => (
              <input
                {...p}
                dir="auto"
                maxLength={80}
                value={v.name}
                onChange={(e) => set('name', e.target.value)}
              />
            )}
          </Field>
          <Field label={t('notifications.templates.language')}>
            {(p) => (
              <select
                {...p}
                value={v.language}
                onChange={(e) => set('language', e.target.value as Language)}
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            )}
          </Field>
        </div>
        <Field label={t('notifications.templates.subject')} required error={errors.subject}>
          {(p) => (
            <input
              {...p}
              dir="auto"
              lang={v.language}
              maxLength={200}
              value={v.subject}
              onChange={(e) => set('subject', e.target.value)}
            />
          )}
        </Field>
        <Field
          label={t('notifications.templates.body')}
          hint={t('aiAdmin.prompts.hint', {
            required: required.map((x) => `{${x}}`).join(' '),
            optional: optional.map((x) => `{${x}}`).join(' '),
          })}
          required
          error={errors.body}
        >
          {(p) => (
            <textarea
              {...p}
              className={`${p.className} ${layout.textarea}`}
              dir="auto"
              lang={v.language}
              rows={6}
              value={v.body}
              onChange={(e) => set('body', e.target.value)}
            />
          )}
        </Field>
        {(check.missing.length > 0 || check.unknown.length > 0) && (
          <p className={layout.muted} data-testid="template-check">
            {check.missing.length > 0 && (
              <>
                {t('aiAdmin.prompts.missing')}{' '}
                <bdi className={layout.mono}>
                  {check.missing.map((x) => `{${x}}`).join(' ')}
                </bdi>{' '}
              </>
            )}
            {check.unknown.length > 0 && (
              <>
                {t('aiAdmin.prompts.unknown')}{' '}
                <bdi className={layout.mono}>{check.unknown.map((x) => `{${x}}`).join(' ')}</bdi>
              </>
            )}
          </p>
        )}
        <div>
          <p className={layout.muted}>
            {t('notifications.templates.preview')}{' '}
            <Badge tone="mock">{t('common.synthetic')}</Badge>
          </p>
          <div
            className={layout.preview}
            lang={v.language}
            dir="auto"
            data-testid="template-preview"
          >
            <strong>{renderTemplate(v.subject, values)}</strong>
            {'\n\n'}
            {renderTemplate(v.body, values)}
          </div>
        </div>
        <Field label={t('aiAdmin.form.changeNote')} required error={errors.changeNote}>
          {(p) => (
            <input
              {...p}
              maxLength={200}
              value={v.changeNote}
              onChange={(e) => set('changeNote', e.target.value)}
            />
          )}
        </Field>
      </form>
      {formError && <Notice tone="danger" title={formError} />}
    </Dialog>
  );
}
