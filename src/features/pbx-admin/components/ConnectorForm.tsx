import { useMemo, useState, type FormEvent } from 'react';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type {
  PbxConnector,
  PbxConnectorInput,
  PbxSettingValue,
  Queue,
} from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Checkbox, Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { todayISO } from '@/shared/utils/dates';
import { INGESTION_MIN_DATE, POLL_RANGE } from '@/shared/utils/pbxRules';
import { useSaveConnector } from '../hooks/usePbxAdmin';
import {
  impactfulChanges,
  ingestibleQueues,
  needsConfirmation,
  toConnectorInput,
  validateConnector,
} from '../model/pbx';
import type { PbxVendorFormAdapter } from '../vendors';

const GENERIC_FIELDS: Record<string, string> = {
  name: 'name',
  queue_ids: 'queueIds',
  ingestion_start_date: 'ingestionStartDate',
  poll_interval_minutes: 'pollIntervalMinutes',
  secret: 'secret',
};

/** Connector settings rendered from the vendor's form adapter. The secret is write-only. */
export function ConnectorForm({
  connector,
  adapter,
  vendorName,
  queues,
}: {
  connector: PbxConnector;
  adapter: PbxVendorFormAdapter;
  vendorName: string;
  queues: readonly Queue[];
}) {
  const { t, pick } = useI18n();
  const toast = useToast();
  const canManage = usePermission('pbx.manage');
  const save = useSaveConnector();
  const initial = useMemo(() => toConnectorInput(connector, adapter), [connector, adapter]);
  const [v, setV] = useState<PbxConnectorInput>(initial);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const today = todayISO();
  const impact = impactfulChanges(connector, v);
  const queueName = (id: string) => {
    const q = queues.find((x) => x.id === id);
    return q ? `${q.number} ${pick(q.name)}` : id;
  };
  const serverFields = useMemo(
    () => ({
      ...GENERIC_FIELDS,
      ...Object.fromEntries(adapter.fields.map((f) => [f.serverField ?? f.key, f.key])),
    }),
    [adapter],
  );

  const setSetting = (key: string, value: PbxSettingValue) =>
    setV((x) => ({ ...x, settings: { ...x.settings, [key]: value } }));

  async function persist(confirm: boolean) {
    try {
      await save.mutate({ id: connector.id, input: v, confirm });
      toast('success', t('pbxAdmin.form.saved'));
      setV((x) => ({ ...x, secret: '' }));
      setConfirming(false);
    } catch (err) {
      setConfirming(false);
      const mapped = mapFieldIssues(err, serverFields);
      if (mapped) setErrors(mapped.fields);
      if (!mapped || mapped.unmapped.length > 0)
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const client = validateConnector(v, adapter, connector.credentialSet, today);
    setErrors(Object.fromEntries(Object.entries(client).map(([k, key]) => [k, key ? t(key) : ''])));
    if (Object.keys(client).length > 0) {
      setFormError(t('errors.validation'));
      return;
    }
    if (needsConfirmation(impact)) setConfirming(true);
    else await persist(false);
  }

  return (
    <Card title={t('pbxAdmin.form.title')} caption={t('pbxAdmin.form.caption')}>
      <form
        onSubmit={submit}
        noValidate
        className={layout.form}
        aria-label={t('pbxAdmin.form.title')}
      >
        <fieldset disabled={!canManage} className={`${layout.form} ${layout.bare}`}>
          <div className={layout.row}>
            <Field label={t('pbxAdmin.form.name')} required error={errors.name}>
              {(p) => (
                <input
                  {...p}
                  maxLength={60}
                  value={v.name}
                  onChange={(e) => setV((x) => ({ ...x, name: e.target.value }))}
                />
              )}
            </Field>
            <Field label={t('pbxAdmin.form.vendor')} hint={t('pbxAdmin.form.vendorHint')}>
              {(p) => <input {...p} value={vendorName} readOnly />}
            </Field>
          </div>
          <div className={layout.row}>
            {adapter.fields
              .filter((f) => f.type !== 'boolean')
              .map((f) => (
                <Field
                  key={f.key}
                  label={t(f.label)}
                  hint={f.hint ? t(f.hint) : undefined}
                  required={f.required ?? false}
                  error={errors[f.key]}
                >
                  {(p) =>
                    f.type === 'number' ? (
                      <input
                        {...p}
                        type="number"
                        dir="ltr"
                        min={f.min}
                        max={f.max}
                        value={
                          Number.isNaN(Number(v.settings[f.key]))
                            ? ''
                            : String(v.settings[f.key] ?? '')
                        }
                        onChange={(e) =>
                          setSetting(
                            f.key,
                            e.target.value === '' ? Number.NaN : Number(e.target.value),
                          )
                        }
                      />
                    ) : (
                      <input
                        {...p}
                        dir="ltr"
                        autoComplete="off"
                        spellCheck={false}
                        value={String(v.settings[f.key] ?? '')}
                        onChange={(e) => setSetting(f.key, e.target.value)}
                      />
                    )
                  }
                </Field>
              ))}
            <Field
              label={t(adapter.secretLabel)}
              hint={t(adapter.secretHint)}
              required={!connector.credentialSet}
              error={errors.secret}
            >
              {(p) => (
                <input
                  {...p}
                  type="password"
                  dir="ltr"
                  autoComplete="new-password"
                  placeholder={connector.credentialSet ? t('pbxAdmin.form.secretKept') : ''}
                  value={v.secret}
                  onChange={(e) => setV((x) => ({ ...x, secret: e.target.value }))}
                />
              )}
            </Field>
          </div>
          <p className={layout.muted} data-testid="credential-state">
            {connector.credentialSet ? (
              <Badge tone="success" icon="lock">
                {t('pbxAdmin.form.credentialStored')}
              </Badge>
            ) : (
              <Badge tone="warning" icon="alert">
                {t('pbxAdmin.form.credentialMissing')}
              </Badge>
            )}{' '}
            {t('pbxAdmin.form.secretNote')}
          </p>
          {adapter.fields
            .filter((f) => f.type === 'boolean')
            .map((f) => (
              <div key={f.key}>
                <Checkbox
                  checked={v.settings[f.key] === true}
                  onChange={(on) => setSetting(f.key, on)}
                >
                  {t(f.label)}
                </Checkbox>
                {errors[f.key] && <Notice tone="danger" title={errors[f.key]} />}
              </div>
            ))}
          <fieldset className={layout.checks}>
            <legend>{t('pbxAdmin.form.queues')}</legend>
            {ingestibleQueues(queues, connector.queueIds).map((q) => (
              <Checkbox
                key={q.id}
                checked={v.queueIds.includes(q.id)}
                onChange={(on) =>
                  setV((x) => ({
                    ...x,
                    queueIds: on ? [...x.queueIds, q.id] : x.queueIds.filter((id) => id !== q.id),
                  }))
                }
              >
                <bdi>{q.number}</bdi> · {pick(q.name)}
              </Checkbox>
            ))}
            {errors.queueIds && <Notice tone="danger" title={errors.queueIds} />}
          </fieldset>
          <div className={layout.row}>
            <Field
              label={t('pbxAdmin.form.startDate')}
              hint={t('pbxAdmin.form.startDateHint')}
              required
              error={errors.ingestionStartDate}
            >
              {(p) => (
                <input
                  {...p}
                  type="date"
                  min={INGESTION_MIN_DATE}
                  max={today}
                  value={v.ingestionStartDate}
                  onChange={(e) => setV((x) => ({ ...x, ingestionStartDate: e.target.value }))}
                />
              )}
            </Field>
            <Field
              label={t('pbxAdmin.form.poll')}
              hint={t('aiAdmin.form.range', { min: POLL_RANGE[0], max: POLL_RANGE[1] })}
              required
              error={errors.pollIntervalMinutes}
            >
              {(p) => (
                <input
                  {...p}
                  type="number"
                  min={POLL_RANGE[0]}
                  max={POLL_RANGE[1]}
                  value={Number.isNaN(v.pollIntervalMinutes) ? '' : v.pollIntervalMinutes}
                  onChange={(e) =>
                    setV((x) => ({
                      ...x,
                      pollIntervalMinutes:
                        e.target.value === '' ? Number.NaN : Number(e.target.value),
                    }))
                  }
                />
              )}
            </Field>
          </div>
        </fieldset>
        {formError && <Notice tone="danger" title={formError} />}
        {canManage && (
          <div className={layout.actions}>
            <Button variant="primary" type="submit" loading={save.isPending}>
              {t('pbxAdmin.form.save')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setV(initial);
                setErrors({});
                setFormError(null);
              }}
            >
              {t('aiAdmin.form.discard')}
            </Button>
          </div>
        )}
      </form>
      {confirming && (
        <ConfirmDialog
          title={t('pbxAdmin.form.confirmTitle')}
          confirmLabel={t('pbxAdmin.form.save')}
          tone="primary"
          acknowledge={t('pbxAdmin.form.confirmAck')}
          onClose={() => setConfirming(false)}
          onConfirm={() => persist(true)}
        >
          <ul className={layout.list}>
            {impact.startDate && (
              <li>
                {t(
                  impact.startDate.to < impact.startDate.from
                    ? 'pbxAdmin.form.backfill'
                    : 'pbxAdmin.form.later',
                  impact.startDate,
                )}
              </li>
            )}
            {impact.removedQueues.length > 0 && (
              <li>
                {t('pbxAdmin.form.removedQueues', {
                  list: impact.removedQueues.map(queueName).join(', '),
                })}
              </li>
            )}
          </ul>
        </ConfirmDialog>
      )}
    </Card>
  );
}
