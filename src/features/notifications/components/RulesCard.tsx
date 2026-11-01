import { useState, type FormEvent } from 'react';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type {
  EmailTemplate,
  NotificationRule,
  NotificationRuleInput,
  NotificationTrigger,
  Queue,
} from '@/shared/types/domain';
import { Badge, SyntheticBadge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Dialog } from '@/shared/ui/Dialog';
import { Checkbox, Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { EmptyState } from '@/shared/ui/States';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { useToast } from '@/shared/ui/Toaster';
import { splitList } from '@/shared/utils/arabic';
import { useSaveRule, useTestRule } from '../hooks/useNotifications';
import { emptyRule, RULE_SERVER_FIELD, validateRule, type RuleField } from '../model/notifications';

const TRIGGERS: readonly NotificationTrigger[] = [
  'low_score',
  'insufficient_evidence',
  'prohibited_flag',
];

/** Configurable low-quality notification rules. */
export function RulesCard({
  rules,
  templates,
  queues,
}: {
  rules: readonly NotificationRule[];
  templates: readonly EmailTemplate[];
  queues: readonly Queue[];
}) {
  const { t, pick } = useI18n();
  const toast = useToast();
  const canManage = usePermission('notifications.manage');
  const save = useSaveRule();
  const test = useTestRule();
  const [editing, setEditing] = useState<NotificationRule | 'new' | null>(null);
  const alertTemplates = templates.filter((x) => x.kind === 'low_quality_alert');

  async function toggle(r: NotificationRule) {
    try {
      await save.mutate({ id: r.id, input: { enabled: !r.enabled } });
      toast(
        'success',
        t(r.enabled ? 'notifications.rules.disabledToast' : 'notifications.rules.enabledToast', {
          name: r.name,
        }),
      );
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }
  async function runTest(r: NotificationRule) {
    try {
      const d = await test.mutate(r.id);
      toast('success', t('notifications.rules.testRecorded', { subject: d.subject }));
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }

  return (
    <Card
      title={t('notifications.rules.title')}
      caption={t('notifications.rules.caption')}
      actions={
        canManage && (
          <Button icon="plus" onClick={() => setEditing('new')}>
            {t('notifications.rules.add')}
          </Button>
        )
      }
      flush
    >
      {rules.length === 0 ? (
        <EmptyState title={t('notifications.rules.empty')} />
      ) : (
        <TableRegion label={t('notifications.rules.title')}>
          <thead>
            <tr>
              <th scope="col">{t('notifications.rules.name')}</th>
              <th scope="col">{t('notifications.rules.trigger')}</th>
              <th scope="col">{t('notifications.rules.recipients')}</th>
              <th scope="col">{t('notifications.rules.delivery')}</th>
              <th scope="col">{t('agents.fields.status')}</th>
              <th scope="col">
                <span className="visually-hidden">{t('common.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td className={tableStyles.wrap}>
                  {r.name} {r.synthetic && <SyntheticBadge />}
                  <div className={tableStyles.muted}>
                    {r.queueIds.length === 0
                      ? t('queues.filter.all')
                      : r.queueIds
                          .map((id) => queues.find((q) => q.id === id)?.number ?? id)
                          .join(', ')}
                  </div>
                </td>
                <td className={tableStyles.wrap}>
                  {t(`notifications.triggers.${r.trigger}`)}
                  {r.trigger === 'low_score' && (
                    <div className={tableStyles.muted}>
                      {r.thresholdMode === 'custom'
                        ? t('notifications.rules.customThresholdValue', {
                            n: r.customThreshold ?? 0,
                          })
                        : t('notifications.rules.scorecardThreshold')}
                    </div>
                  )}
                </td>
                <td className={tableStyles.wrap}>
                  <bdi>{r.recipients.join(', ')}</bdi>
                </td>
                <td>{t(`notifications.deliveryModes.${r.delivery}`)}</td>
                <td>
                  <Badge tone={r.enabled ? 'success' : 'neutral'}>
                    {t(r.enabled ? 'notifications.rules.on' : 'notifications.rules.off')}
                  </Badge>
                </td>
                <td>
                  {canManage && (
                    <>
                      <Button variant="ghost" size="sm" icon="edit" onClick={() => setEditing(r)}>
                        {t('common.edit')}
                        <span className="visually-hidden"> — {r.name}</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggle(r)}>
                        {t(
                          r.enabled ? 'notifications.rules.disable' : 'notifications.rules.enable',
                        )}
                        <span className="visually-hidden"> — {r.name}</span>
                      </Button>
                      <Button variant="ghost" size="sm" icon="mail" onClick={() => runTest(r)}>
                        {t('notifications.rules.test')}
                        <span className="visually-hidden"> — {r.name}</span>
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableRegion>
      )}
      {editing && (
        <RuleDialog
          rule={editing === 'new' ? null : editing}
          templates={alertTemplates}
          queues={queues.filter((q) => q.status !== 'disabled')}
          pick={pick}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}

function RuleDialog({
  rule,
  templates,
  queues,
  pick,
  onClose,
}: {
  rule: NotificationRule | null;
  templates: readonly EmailTemplate[];
  queues: readonly Queue[];
  pick: ReturnType<typeof useI18n>['pick'];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const save = useSaveRule();
  const [v, setV] = useState<NotificationRuleInput>(rule ?? emptyRule(templates[0]?.id ?? ''));
  const [recipients, setRecipients] = useState(v.recipients.join(', '));
  const [errors, setErrors] = useState<Partial<Record<RuleField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = <K extends keyof NotificationRuleInput>(k: K, value: NotificationRuleInput[K]) =>
    setV((x) => ({ ...x, [k]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const input = { ...v, recipients: splitList(recipients) };
    const client = validateRule(input);
    setErrors(Object.fromEntries(Object.entries(client).map(([k, key]) => [k, t(key)])));
    if (Object.keys(client).length > 0) return;
    try {
      await save.mutate({ id: rule?.id ?? null, input });
      toast(
        'success',
        t(rule ? 'notifications.rules.updated' : 'notifications.rules.created', {
          name: input.name.trim(),
        }),
      );
      onClose();
    } catch (err) {
      const mapped = mapFieldIssues(err, RULE_SERVER_FIELD);
      if (mapped) setErrors(mapped.fields);
      if (!mapped || mapped.unmapped.length > 0)
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
    }
  }

  return (
    <Dialog
      open
      title={rule ? t('notifications.rules.editTitle') : t('notifications.rules.createTitle')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit" form="rule-form" loading={save.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="rule-form" onSubmit={submit} noValidate className={layout.form}>
        <div className={layout.row}>
          <Field label={t('notifications.rules.name')} required error={errors.name}>
            {(p) => (
              <input
                {...p}
                maxLength={60}
                value={v.name}
                onChange={(e) => set('name', e.target.value)}
              />
            )}
          </Field>
          <Field label={t('notifications.rules.trigger')}>
            {(p) => (
              <select
                {...p}
                value={v.trigger}
                onChange={(e) => set('trigger', e.target.value as NotificationTrigger)}
              >
                {TRIGGERS.map((x) => (
                  <option key={x} value={x}>
                    {t(`notifications.triggers.${x}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t('notifications.rules.delivery')}>
            {(p) => (
              <select
                {...p}
                value={v.delivery}
                onChange={(e) =>
                  set('delivery', e.target.value as NotificationRuleInput['delivery'])
                }
              >
                <option value="immediate">{t('notifications.deliveryModes.immediate')}</option>
                <option value="daily_digest">
                  {t('notifications.deliveryModes.daily_digest')}
                </option>
              </select>
            )}
          </Field>
        </div>
        {v.trigger === 'low_score' && (
          <div className={layout.row}>
            <Field
              label={t('notifications.rules.threshold')}
              hint={t('notifications.rules.thresholdHint')}
            >
              {(p) => (
                <select
                  {...p}
                  value={v.thresholdMode}
                  onChange={(e) => {
                    const custom = e.target.value === 'custom';
                    setV((x) => ({
                      ...x,
                      thresholdMode: custom ? 'custom' : 'scorecard',
                      customThreshold: custom ? (x.customThreshold ?? 6) : null,
                    }));
                  }}
                >
                  <option value="scorecard">{t('notifications.rules.scorecardThreshold')}</option>
                  <option value="custom">{t('notifications.rules.customThreshold')}</option>
                </select>
              )}
            </Field>
            {v.thresholdMode === 'custom' && (
              <Field
                label={t('notifications.rules.customThreshold')}
                required
                error={errors.customThreshold}
              >
                {(p) => (
                  <input
                    {...p}
                    type="number"
                    min={0.01}
                    max={10}
                    step={0.25}
                    value={v.customThreshold ?? ''}
                    onChange={(e) =>
                      set('customThreshold', e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                )}
              </Field>
            )}
          </div>
        )}
        <Field
          label={t('notifications.rules.recipients')}
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
        <Field label={t('notifications.rules.template')} required error={errors.templateId}>
          {(p) => (
            <select {...p} value={v.templateId} onChange={(e) => set('templateId', e.target.value)}>
              {templates.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <fieldset className={layout.checks}>
          <legend>{t('notifications.rules.queues')}</legend>
          {queues.map((q) => (
            <Checkbox
              key={q.id}
              checked={v.queueIds.includes(q.id)}
              onChange={(on) =>
                set('queueIds', on ? [...v.queueIds, q.id] : v.queueIds.filter((id) => id !== q.id))
              }
            >
              <bdi>{q.number}</bdi> · {pick(q.name)}
            </Checkbox>
          ))}
          <span className={layout.muted}>{t('notifications.rules.queuesHint')}</span>
        </fieldset>
        <Checkbox checked={v.enabled} onChange={(on) => set('enabled', on)}>
          {t('notifications.rules.enabled')}
        </Checkbox>
      </form>
      {formError && <Notice tone="danger" title={formError} />}
    </Dialog>
  );
}
