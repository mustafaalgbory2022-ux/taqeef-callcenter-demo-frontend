import { useState, type FormEvent } from 'react';
import { focusFirstInvalid } from '@/shared/ui/focusInvalid';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Agent, Queue, ReportSettings, ReportSettingsInput } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Checkbox, Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import {
  APPROVED_SAMPLE,
  CALLS_PER_AGENT_RANGE,
  differsFromApproved,
  MIN_DURATION_RANGE,
} from '@/shared/utils/reportRules';
import { useSaveReportSettings } from '../hooks/useReports';
import {
  SETTINGS_SERVER_FIELD,
  toSettingsInput,
  validateReportSettings,
  type SettingsField,
} from '../model/reportSettings';

const toggle = (list: readonly string[], id: string, on: boolean) =>
  on ? [...list, id] : list.filter((x) => x !== id);

/** Sampling policy, default scope and delivery for manually generated reports (versioned). */
export function ReportSettingsForm({
  settings,
  agents,
  queues,
}: {
  settings: ReportSettings;
  agents: readonly Agent[];
  queues: readonly Queue[];
}) {
  const { t, pick } = useI18n();
  const toast = useToast();
  const canManage = usePermission('reports.manage');
  const save = useSaveReportSettings();
  const [v, setV] = useState<ReportSettingsInput>(() => toSettingsInput(settings));
  const [errors, setErrors] = useState<Partial<Record<SettingsField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = <K extends keyof ReportSettingsInput>(k: K, value: ReportSettingsInput[K]) =>
    setV((x) => ({ ...x, [k]: value }));
  const num = (s: string) => (s === '' ? Number.NaN : Number(s));

  async function submit(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    e.preventDefault();
    setFormError(null);
    const client = validateReportSettings(v);
    setErrors(Object.fromEntries(Object.entries(client).map(([k, key]) => [k, t(key)])));
    if (Object.keys(client).length > 0) {
      focusFirstInvalid(form);
      return;
    }
    try {
      const saved = await save.mutate(v);
      toast('success', t('reportSettings.form.saved', { v: saved.version }));
    } catch (err) {
      const mapped = mapFieldIssues(err, SETTINGS_SERVER_FIELD);
      if (mapped) setErrors(mapped.fields);
      focusFirstInvalid(form);
      if (!mapped || mapped.unmapped.length > 0)
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
    }
  }

  return (
    <Card
      title={t('reportSettings.form.title')}
      caption={t('reportSettings.form.caption', { v: settings.version })}
    >
      <form
        onSubmit={submit}
        noValidate
        className={layout.form}
        aria-label={t('reportSettings.form.title')}
      >
        <fieldset disabled={!canManage} className={`${layout.form} ${layout.bare}`}>
          <div className={layout.row}>
            <Field
              label={t('reportSettings.form.callsPerAgent')}
              hint={t('aiAdmin.form.range', {
                min: CALLS_PER_AGENT_RANGE[0],
                max: CALLS_PER_AGENT_RANGE[1],
              })}
              required
              error={errors.callsPerAgent}
            >
              {(p) => (
                <input
                  {...p}
                  type="number"
                  min={CALLS_PER_AGENT_RANGE[0]}
                  max={CALLS_PER_AGENT_RANGE[1]}
                  value={Number.isNaN(v.callsPerAgent) ? '' : v.callsPerAgent}
                  onChange={(e) => set('callsPerAgent', num(e.target.value))}
                />
              )}
            </Field>
            <Field
              label={t('reportSettings.form.minDuration')}
              hint={t('aiAdmin.form.range', {
                min: MIN_DURATION_RANGE[0],
                max: MIN_DURATION_RANGE[1],
              })}
              required
              error={errors.minDurationSeconds}
            >
              {(p) => (
                <input
                  {...p}
                  type="number"
                  min={MIN_DURATION_RANGE[0]}
                  max={MIN_DURATION_RANGE[1]}
                  value={Number.isNaN(v.minDurationSeconds) ? '' : v.minDurationSeconds}
                  onChange={(e) => set('minDurationSeconds', num(e.target.value))}
                />
              )}
            </Field>
          </div>
          <p className={layout.muted}>
            <Badge icon="lock">{t('aiAdmin.locked.badge')}</Badge>{' '}
            {t('reportSettings.form.answeredOnly')}
          </p>
          {differsFromApproved(v.callsPerAgent, v.minDurationSeconds) && (
            <Notice
              tone="warning"
              title={t('reportSettings.form.policyWarning', APPROVED_SAMPLE)}
              testId="policy-warning"
            />
          )}
          <fieldset className={layout.checks}>
            <legend>{t('reportSettings.form.queues')}</legend>
            {queues
              .filter((q) => q.status !== 'disabled' || v.defaultQueueIds.includes(q.id))
              .map((q) => (
                <Checkbox
                  key={q.id}
                  checked={v.defaultQueueIds.includes(q.id)}
                  onChange={(on) => set('defaultQueueIds', toggle(v.defaultQueueIds, q.id, on))}
                >
                  <bdi>{q.number}</bdi> · {pick(q.name)}
                </Checkbox>
              ))}
            {errors.defaultQueueIds && <Notice tone="danger" title={errors.defaultQueueIds} />}
          </fieldset>
          <fieldset className={layout.checks}>
            <legend>{t('reportSettings.form.agents')}</legend>
            {(['all_active', 'selected'] as const).map((mode) => (
              <label key={mode}>
                <input
                  type="radio"
                  name="agent-selection"
                  checked={v.agentSelection === mode}
                  onChange={() => set('agentSelection', mode)}
                />{' '}
                {t(`reportSettings.form.agentModes.${mode}`)}
              </label>
            ))}
            {v.agentSelection === 'selected' &&
              agents.map((a) => (
                <Checkbox
                  key={a.id}
                  checked={v.defaultAgentIds.includes(a.id)}
                  onChange={(on) => set('defaultAgentIds', toggle(v.defaultAgentIds, a.id, on))}
                >
                  {a.displayName}
                </Checkbox>
              ))}
            {errors.defaultAgentIds && <Notice tone="danger" title={errors.defaultAgentIds} />}
          </fieldset>
          <Field
            label={t('reportSettings.form.delivery')}
            hint={t('reportSettings.form.deliveryHint')}
          >
            {(p) => (
              <select
                {...p}
                value={v.delivery}
                onChange={(e) => set('delivery', e.target.value as ReportSettingsInput['delivery'])}
              >
                <option value="download_only">{t('reportSettings.delivery.download_only')}</option>
                <option value="email_on_generate">
                  {t('reportSettings.delivery.email_on_generate')}
                </option>
              </select>
            )}
          </Field>
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
        </fieldset>
        {formError && <Notice tone="danger" title={formError} />}
        {canManage && (
          <div className={layout.actions}>
            <Button variant="primary" type="submit" loading={save.isPending}>
              {t('aiAdmin.form.save', { v: settings.version + 1 })}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

/** Automatic scheduling stays off until it is explicitly authorized. */
export function SchedulingCard({ settings }: { settings: ReportSettings }) {
  const { t } = useI18n();
  return (
    <Card
      title={t('reportSettings.scheduling.title')}
      caption={t('reportSettings.scheduling.caption')}
    >
      <div className={layout.stack} data-testid="scheduling">
        <p>
          <Badge tone="neutral" icon="lock">
            {t(
              settings.schedulingAuthorized
                ? 'reportSettings.scheduling.authorized'
                : 'reportSettings.scheduling.notAuthorized',
            )}
          </Badge>
        </p>
        <Checkbox checked={false} disabled onChange={() => undefined} describedBy="scheduling-note">
          {t('reportSettings.scheduling.toggle')}
        </Checkbox>
        <p id="scheduling-note" className={layout.muted}>
          {t('reportSettings.scheduling.note')}
        </p>
      </div>
    </Card>
  );
}
