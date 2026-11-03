import { useState, type FormEvent } from 'react';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type {
  RecoverableType,
  RecoveryItem,
  StorageCategory,
  StorageOverview,
  StorageSettings,
  StorageSettingsInput,
} from '@/shared/types/domain';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { EmptyState } from '@/shared/ui/States';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { useToast } from '@/shared/ui/Toaster';
import { UsageMeter } from '@/shared/ui/UsageMeter';
import {
  MIN_RETENTION_DAYS,
  REASON_MIN,
  RECOVERY_WINDOW_DAYS,
  STORAGE_CATEGORIES,
  usedPct,
} from '@/shared/utils/storageRules';
import { useMoveToRecovery, useRestore, useSaveStorage } from '../hooks/useStorage';
import {
  hasRisk,
  STORAGE_SERVER_FIELD,
  storageRisks,
  toStorageInput,
  validateStorage,
  validReason,
  type StorageErrors,
} from '../model/storage';

const VOLUME_TONE: Record<StorageOverview['volumes'][number]['status'], BadgeTone> = {
  ok: 'success',
  warning: 'warning',
  critical: 'danger',
  unavailable: 'neutral',
};

export function OverviewCard({ overview }: { overview: StorageOverview }) {
  const { t, fmt } = useI18n();
  const volumeName = (id: string) => overview.volumes.find((v) => v.id === id)?.name ?? id;
  return (
    <Card
      title={t('storage.overview.title')}
      caption={t('storage.overview.caption', { w: overview.warningPct, c: overview.criticalPct })}
    >
      <div className={layout.stack}>
        <div className={layout.grid} data-testid="volumes">
          {overview.volumes.map((v) => (
            <UsageMeter
              key={v.id}
              label={v.name}
              pct={usedPct(v.usedGb, v.totalGb)}
              status={v.status}
              valueText={
                v.status === 'unavailable'
                  ? t('storage.overview.unavailable')
                  : t('storage.overview.used', {
                      used: fmt.number(v.usedGb),
                      total: fmt.number(v.totalGb),
                      pct: Math.round(usedPct(v.usedGb, v.totalGb)),
                    })
              }
            >
              <span className={layout.muted}>
                <bdi className={layout.mono}>{v.path}</bdi> · {t(`storage.kinds.${v.kind}`)} ·{' '}
                <Badge tone={VOLUME_TONE[v.status]}>{t(`storage.status.${v.status}`)}</Badge>
              </span>
            </UsageMeter>
          ))}
        </div>
        {overview.volumes.some((v) => v.status === 'warning' || v.status === 'critical') && (
          <Notice tone="warning" title={t('storage.overview.capacityWarning')} />
        )}
        <TableRegion label={t('storage.overview.categories')}>
          <thead>
            <tr>
              <th scope="col">{t('storage.overview.category')}</th>
              <th scope="col">{t('storage.overview.items')}</th>
              <th scope="col">{t('storage.overview.size')}</th>
              <th scope="col">{t('storage.overview.location')}</th>
              <th scope="col">{t('storage.overview.oldest')}</th>
            </tr>
          </thead>
          <tbody>
            {overview.categories.map((c) => (
              <tr key={c.category}>
                <th scope="row">{t(`storage.categories.${c.category}`)}</th>
                <td>
                  <bdi>{fmt.number(c.items)}</bdi>
                </td>
                <td>
                  <bdi>{fmt.number(c.usedGb)} GB</bdi>
                </td>
                <td>{volumeName(c.volumeId)}</td>
                <td className={tableStyles.muted}>
                  <bdi>{c.oldestItemAt ? fmt.date(c.oldestItemAt) : '—'}</bdi>
                </td>
              </tr>
            ))}
          </tbody>
        </TableRegion>
        {overview.simulated && (
          <p className={layout.muted}>
            <Badge tone="mock">{t('common.simulated')}</Badge> {t('storage.overview.estimate')}
          </p>
        )}
      </div>
    </Card>
  );
}

export function StorageSettingsForm({
  settings,
  overview,
}: {
  settings: StorageSettings;
  overview: StorageOverview;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const canManage = usePermission('storage.manage');
  const save = useSaveStorage();
  const [v, setV] = useState<StorageSettingsInput>(() => toStorageInput(settings));
  const [errors, setErrors] = useState<Partial<Record<keyof StorageErrors, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const risks = storageRisks(settings, v);

  const setLocation = (c: StorageCategory, id: string) =>
    setV((x) => ({ ...x, locations: { ...x.locations, [c]: id } }));
  const setRule = (c: StorageCategory, mode: 'keep' | 'recover_after', days: number | null) =>
    setV((x) => ({
      ...x,
      retention: x.retention.map((r) => (r.category === c ? { category: c, mode, days } : r)),
    }));

  async function persist(confirm: boolean) {
    try {
      const saved = await save.mutate({ input: v, confirm });
      toast('success', t('storage.settings.saved', { v: saved.version }));
      setConfirming(false);
    } catch (err) {
      setConfirming(false);
      const mapped = mapFieldIssues(err, STORAGE_SERVER_FIELD);
      if (mapped) setErrors(mapped.fields);
      if (!mapped || mapped.unmapped.length > 0)
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const client = validateStorage(v, overview.volumes, settings);
    setErrors(Object.fromEntries(Object.entries(client).map(([k, key]) => [k, t(key)])));
    if (Object.keys(client).length > 0) return;
    if (hasRisk(risks)) setConfirming(true);
    else await persist(false);
  }

  return (
    <Card
      title={t('storage.settings.title')}
      caption={t('storage.settings.caption', { v: settings.version })}
    >
      <form
        onSubmit={submit}
        noValidate
        className={layout.form}
        aria-label={t('storage.settings.title')}
      >
        <Notice tone="info" title={t('storage.settings.noAutoDelete')} />
        <fieldset disabled={!canManage} className={`${layout.form} ${layout.bare}`}>
          <TableRegion label={t('storage.settings.title')}>
            <thead>
              <tr>
                <th scope="col">{t('storage.overview.category')}</th>
                <th scope="col">{t('storage.overview.location')}</th>
                <th scope="col">{t('storage.settings.retention')}</th>
                <th scope="col">{t('storage.settings.days')}</th>
              </tr>
            </thead>
            <tbody>
              {STORAGE_CATEGORIES.map((c) => {
                const rule = v.retention.find((r) => r.category === c);
                return (
                  <tr key={c}>
                    <th scope="row">{t(`storage.categories.${c}`)}</th>
                    <td>
                      <Field
                        label={t('storage.settings.locationFor', {
                          c: t(`storage.categories.${c}`),
                        })}
                        error={errors[`location.${c}`]}
                      >
                        {(p) => (
                          <select
                            {...p}
                            value={v.locations[c]}
                            onChange={(e) => setLocation(c, e.target.value)}
                          >
                            {overview.volumes.map((vol) => (
                              <option
                                key={vol.id}
                                value={vol.id}
                                disabled={
                                  vol.status === 'unavailable' && settings.locations[c] !== vol.id
                                }
                              >
                                {vol.name}
                                {vol.status === 'unavailable'
                                  ? ` (${t('storage.status.unavailable')})`
                                  : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </Field>
                    </td>
                    <td>
                      <Field
                        label={t('storage.settings.retentionFor', {
                          c: t(`storage.categories.${c}`),
                        })}
                      >
                        {(p) => (
                          <select
                            {...p}
                            value={rule?.mode ?? 'keep'}
                            onChange={(e) =>
                              setRule(
                                c,
                                e.target.value === 'recover_after' ? 'recover_after' : 'keep',
                                e.target.value === 'recover_after' ? (rule?.days ?? 365) : null,
                              )
                            }
                          >
                            <option value="keep">{t('storage.settings.keep')}</option>
                            <option value="recover_after">
                              {t('storage.settings.recoverAfter')}
                            </option>
                          </select>
                        )}
                      </Field>
                    </td>
                    <td>
                      {rule?.mode === 'recover_after' && (
                        <Field
                          label={t('storage.settings.daysFor', { c: t(`storage.categories.${c}`) })}
                          error={errors[`retention.${c}`]}
                        >
                          {(p) => (
                            <input
                              {...p}
                              type="number"
                              min={MIN_RETENTION_DAYS}
                              value={rule.days ?? ''}
                              onChange={(e) =>
                                setRule(
                                  c,
                                  'recover_after',
                                  e.target.value === '' ? null : Number(e.target.value),
                                )
                              }
                            />
                          )}
                        </Field>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableRegion>
          <Field label={t('aiAdmin.form.changeNote')} required error={errors.changeNote}>
            {(p) => (
              <input
                {...p}
                maxLength={200}
                value={v.changeNote}
                onChange={(e) => setV((x) => ({ ...x, changeNote: e.target.value }))}
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
      {confirming && (
        <ConfirmDialog
          title={t('storage.settings.confirmTitle')}
          confirmLabel={t('aiAdmin.form.save', { v: settings.version + 1 })}
          acknowledge={t('storage.settings.confirmAck')}
          onClose={() => setConfirming(false)}
          onConfirm={() => persist(true)}
        >
          <ul className={layout.list}>
            {risks.moved.map((c) => (
              <li key={c}>
                {t('storage.settings.moveWarning', { c: t(`storage.categories.${c}`) })}
              </li>
            ))}
            {risks.expiring.map((r) => (
              <li key={r.category}>
                {t('storage.settings.expiryWarning', {
                  c: t(`storage.categories.${r.category}`),
                  n: r.days ?? 0,
                  w: RECOVERY_WINDOW_DAYS,
                })}
              </li>
            ))}
          </ul>
        </ConfirmDialog>
      )}
    </Card>
  );
}

export function RecoveryCard({ items }: { items: readonly RecoveryItem[] }) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const canManage = usePermission('storage.manage');
  const move = useMoveToRecovery();
  const restore = useRestore();
  const [type, setType] = useState<RecoverableType>('recording');
  const [id, setId] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'id' | 'reason', string>>>({});
  const [confirming, setConfirming] = useState(false);
  const [restoring, setRestoring] = useState<RecoveryItem | null>(null);

  function request(e: FormEvent) {
    e.preventDefault();
    const client: typeof errors = {};
    if (!id.trim()) client.id = t('storage.errors.itemId');
    if (!validReason(reason)) client.reason = t('users.errors.reason', { n: REASON_MIN });
    setErrors(client);
    if (Object.keys(client).length === 0) setConfirming(true);
  }

  return (
    <Card title={t('storage.recovery.title')} caption={t('storage.recovery.caption')} flush>
      {canManage && (
        <form
          onSubmit={request}
          noValidate
          className={layout.toolbar}
          aria-label={t('storage.recovery.moveTitle')}
        >
          <Field label={t('storage.recovery.type')}>
            {(p) => (
              <select
                {...p}
                value={type}
                onChange={(e) => setType(e.target.value as RecoverableType)}
              >
                {(['recording', 'transcript', 'report'] as const).map((x) => (
                  <option key={x} value={x}>
                    {t(`storage.recovery.types.${x}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field
            label={t('storage.recovery.itemId')}
            hint={t('storage.recovery.itemIdHint')}
            required
            error={errors.id}
          >
            {(p) => <input {...p} dir="ltr" value={id} onChange={(e) => setId(e.target.value)} />}
          </Field>
          <Field label={t('storage.recovery.reason')} required error={errors.reason}>
            {(p) => (
              <input
                {...p}
                maxLength={300}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
          </Field>
          <Button type="submit" variant="danger">
            {t('storage.recovery.move')}
          </Button>
        </form>
      )}
      {items.length === 0 ? (
        <EmptyState title={t('storage.recovery.empty')} />
      ) : (
        <TableRegion label={t('storage.recovery.title')}>
          <thead>
            <tr>
              <th scope="col">{t('storage.recovery.item')}</th>
              <th scope="col">{t('storage.recovery.reason')}</th>
              <th scope="col">{t('storage.recovery.moved')}</th>
              <th scope="col">{t('agents.fields.status')}</th>
              <th scope="col">
                <span className="visually-hidden">{t('common.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td className={tableStyles.wrap}>
                  {t(`storage.recovery.types.${r.itemType}`)}{' '}
                  <bdi className={layout.mono}>{r.itemId}</bdi>
                  <div className={tableStyles.muted}>{r.label}</div>
                </td>
                <td className={tableStyles.wrap}>{r.reason}</td>
                <td className={tableStyles.muted}>
                  {r.deletedBy} · <bdi>{fmt.dateTime(r.deletedAt)}</bdi>
                </td>
                <td>
                  <Badge tone={r.status === 'recoverable' ? 'warning' : 'success'}>
                    {t(`storage.recovery.status.${r.status}`)}
                  </Badge>
                </td>
                <td>
                  {canManage && r.status === 'recoverable' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="refresh"
                      onClick={() => setRestoring(r)}
                    >
                      {t('storage.recovery.restore')}
                      <span className="visually-hidden"> — {r.itemId}</span>
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableRegion>
      )}
      <Notice tone="info">{t('storage.recovery.noPurge')}</Notice>
      {confirming && (
        <ConfirmDialog
          title={t('storage.recovery.confirmTitle', { id: id.trim() })}
          confirmLabel={t('storage.recovery.move')}
          acknowledge={t('storage.recovery.confirmAck')}
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            await move.mutate({ type, id, reason });
            toast('success', t('storage.recovery.movedToast', { id: id.trim() }));
            setId('');
            setReason('');
            setConfirming(false);
          }}
        >
          <p>{t(`storage.recovery.impact.${type}`)}</p>
        </ConfirmDialog>
      )}
      {restoring && (
        <ConfirmDialog
          title={t('storage.recovery.restoreTitle', { id: restoring.itemId })}
          confirmLabel={t('storage.recovery.restore')}
          tone="primary"
          onClose={() => setRestoring(null)}
          onConfirm={async () => {
            await restore.mutate(restoring.id);
            toast('success', t('storage.recovery.restoredToast', { id: restoring.itemId }));
            setRestoring(null);
          }}
        >
          <p>{t('storage.recovery.restoreBody')}</p>
        </ConfirmDialog>
      )}
    </Card>
  );
}
