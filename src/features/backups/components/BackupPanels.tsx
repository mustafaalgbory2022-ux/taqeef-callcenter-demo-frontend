import { useState, type FormEvent } from 'react';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type {
  BackupComponent,
  BackupRun,
  BackupSettings,
  BackupSettingsInput,
  MigrationReadiness,
  RestoreRun,
  StorageVolume,
} from '@/shared/types/domain';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Checkbox, Field } from '@/shared/ui/Field';
import { Icon } from '@/shared/ui/Icon';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { EmptyState } from '@/shared/ui/States';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { useToast } from '@/shared/ui/Toaster';
import {
  BACKUP_COMPONENTS,
  REQUIRED_COMPONENTS,
  RETENTION_RANGE,
} from '@/shared/utils/backupRules';
import { useSaveBackupSettings, useStartBackup, useVerifyBackup } from '../hooks/useBackups';
import {
  BACKUP_SERVER_FIELD,
  toBackupInput,
  validateBackupSettings,
  type BackupField,
} from '../model/backups';

const STATUS_TONE: Record<MigrationReadiness['overall'], BadgeTone> = {
  ready: 'success',
  attention: 'warning',
  blocked: 'danger',
};

export function BackupSettingsForm({
  settings,
  volumes,
}: {
  settings: BackupSettings;
  volumes: readonly StorageVolume[];
}) {
  const { t } = useI18n();
  const toast = useToast();
  const canManage = usePermission('backups.manage');
  const save = useSaveBackupSettings();
  const [v, setV] = useState<BackupSettingsInput>(() => toBackupInput(settings));
  const [errors, setErrors] = useState<Partial<Record<BackupField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const toggle = (c: BackupComponent, on: boolean) =>
    setV((x) => ({
      ...x,
      components: on ? [...x.components, c] : x.components.filter((y) => y !== c),
    }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const client = validateBackupSettings(v);
    setErrors(Object.fromEntries(Object.entries(client).map(([k, key]) => [k, t(key)])));
    if (Object.keys(client).length) return;
    try {
      const saved = await save.mutate(v);
      toast('success', t('backups.settings.saved', { v: saved.version }));
    } catch (err) {
      const mapped = mapFieldIssues(err, BACKUP_SERVER_FIELD);
      if (mapped) setErrors(mapped.fields);
      if (!mapped || mapped.unmapped.length > 0)
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
    }
  }

  return (
    <Card
      title={t('backups.settings.title')}
      caption={t('backups.settings.caption', { v: settings.version })}
    >
      <form
        onSubmit={submit}
        noValidate
        className={layout.form}
        aria-label={t('backups.settings.title')}
      >
        <fieldset disabled={!canManage} className={`${layout.form} ${layout.bare}`}>
          <p>
            <Badge icon="lock">{t('aiAdmin.locked.badge')}</Badge>{' '}
            {t('backups.settings.encryption')}
          </p>
          <div className={layout.row}>
            <Field label={t('backups.settings.target')}>
              {(p) => (
                <select
                  {...p}
                  value={v.targetVolumeId}
                  onChange={(e) => setV((x) => ({ ...x, targetVolumeId: e.target.value }))}
                >
                  {volumes.map((vol) => (
                    <option key={vol.id} value={vol.id} disabled={vol.status === 'unavailable'}>
                      {vol.name} ({vol.path})
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field
              label={t('backups.settings.retention')}
              hint={t('aiAdmin.form.range', { min: RETENTION_RANGE[0], max: RETENTION_RANGE[1] })}
              error={errors.retentionCount}
            >
              {(p) => (
                <input
                  {...p}
                  type="number"
                  min={RETENTION_RANGE[0]}
                  max={RETENTION_RANGE[1]}
                  value={Number.isNaN(v.retentionCount) ? '' : v.retentionCount}
                  onChange={(e) =>
                    setV((x) => ({
                      ...x,
                      retentionCount: e.target.value === '' ? Number.NaN : Number(e.target.value),
                    }))
                  }
                />
              )}
            </Field>
            <Field label={t('backups.settings.schedule')} hint={t('backups.settings.scheduleHint')}>
              {(p) => (
                <select
                  {...p}
                  value={v.schedule}
                  onChange={(e) =>
                    setV((x) => ({
                      ...x,
                      schedule: e.target.value === 'daily' ? 'daily' : 'manual',
                    }))
                  }
                >
                  <option value="manual">{t('backups.settings.manual')}</option>
                  <option value="daily">{t('backups.settings.daily')}</option>
                </select>
              )}
            </Field>
            {v.schedule === 'daily' && (
              <Field label={t('backups.settings.time')} error={errors.scheduleTime}>
                {(p) => (
                  <input
                    {...p}
                    type="time"
                    value={v.scheduleTime}
                    onChange={(e) => setV((x) => ({ ...x, scheduleTime: e.target.value }))}
                  />
                )}
              </Field>
            )}
          </div>
          <fieldset className={layout.checks}>
            <legend>{t('backups.settings.components')}</legend>
            {BACKUP_COMPONENTS.map((c) => {
              const required = REQUIRED_COMPONENTS.includes(c);
              return (
                <Checkbox
                  key={c}
                  checked={v.components.includes(c)}
                  disabled={required}
                  onChange={(on) => toggle(c, on)}
                >
                  {t(`backups.components.${c}`)}{' '}
                  {required && <Badge icon="lock">{t('backups.settings.required')}</Badge>}
                </Checkbox>
              );
            })}
            {errors.components && <Notice tone="danger" title={errors.components} />}
          </fieldset>
          {v.components.length < BACKUP_COMPONENTS.length && (
            <Notice tone="warning" title={t('backups.settings.partial')} />
          )}
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
    </Card>
  );
}

export function BackupHistoryCard({
  runs,
  onRestore,
}: {
  runs: readonly BackupRun[];
  onRestore: (run: BackupRun) => void;
}) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const canManage = usePermission('backups.manage');
  const start = useStartBackup();
  const verify = useVerifyBackup();
  const [note, setNote] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  async function run() {
    try {
      const r = await start.mutate(note);
      setNote('');
      toast('success', t('backups.history.startedToast', { id: r.id }));
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }

  return (
    <Card title={t('backups.history.title')} caption={t('backups.history.caption')} flush>
      {canManage && (
        <div className={layout.toolbar}>
          <Field label={t('backups.history.note')}>
            {(p) => (
              <input
                {...p}
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </Field>
          <Button variant="primary" icon="play" loading={start.isPending} onClick={run}>
            {t('backups.history.start')}
          </Button>
        </div>
      )}
      {runs.length === 0 ? (
        <EmptyState title={t('backups.history.empty')} />
      ) : (
        <TableRegion label={t('backups.history.title')}>
          <thead>
            <tr>
              <th scope="col">{t('backups.history.id')}</th>
              <th scope="col">{t('backups.history.status')}</th>
              <th scope="col">{t('backups.history.size')}</th>
              <th scope="col">{t('backups.history.verification')}</th>
              <th scope="col">{t('backups.history.started')}</th>
              <th scope="col">
                <span className="visually-hidden">{t('common.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} data-testid={`backup-${r.id}`}>
                <td className={tableStyles.mono}>
                  <bdi>{r.id}</bdi>
                </td>
                <td className={tableStyles.wrap}>
                  <Badge
                    tone={
                      r.status === 'failed'
                        ? 'danger'
                        : r.status === 'completed'
                          ? 'success'
                          : 'mock'
                    }
                  >
                    {t(`backups.status.${r.status}`)}
                  </Badge>
                  <div className={tableStyles.muted}>{r.note}</div>
                </td>
                <td>
                  <bdi>{fmt.number(r.sizeGb)} GB</bdi>
                </td>
                <td className={tableStyles.wrap}>
                  <Badge
                    tone={
                      r.verification.status === 'passed'
                        ? 'success'
                        : r.verification.status === 'failed'
                          ? 'danger'
                          : r.verification.status === 'simulated'
                            ? 'mock'
                            : 'neutral'
                    }
                  >
                    {t(`backups.verification.${r.verification.status}`)}
                  </Badge>
                  {r.verification.results.length > 0 && (
                    <details
                      open={open === r.id}
                      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open ? r.id : null)}
                    >
                      <summary>{t('backups.history.integrity')}</summary>
                      <ul className={layout.list}>
                        {r.verification.results.map((x) => (
                          <li key={x.component}>
                            {t(`backups.components.${x.component}`)}:{' '}
                            {t(`backups.verification.${x.result}`)} — {x.detail}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </td>
                <td className={tableStyles.muted}>
                  {r.startedBy} · <bdi>{fmt.dateTime(r.startedAt)}</bdi>
                </td>
                <td>
                  {canManage && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="check"
                        loading={verify.isPending}
                        onClick={async () => {
                          try {
                            await verify.mutate(r.id);
                            toast('success', t('backups.history.verified', { id: r.id }));
                          } catch (err) {
                            toast('error', describeError(err, t));
                          }
                        }}
                      >
                        {t('backups.history.verify')}
                        <span className="visually-hidden"> — {r.id}</span>
                      </Button>
                      <Button variant="ghost" size="sm" icon="refresh" onClick={() => onRestore(r)}>
                        {t('backups.history.restore')}
                        <span className="visually-hidden"> — {r.id}</span>
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableRegion>
      )}
    </Card>
  );
}

export function RestoreHistoryCard({ restores }: { restores: readonly RestoreRun[] }) {
  const { t, fmt } = useI18n();
  return (
    <Card title={t('backups.restores.title')} caption={t('backups.restores.caption')}>
      {restores.length === 0 ? (
        <EmptyState title={t('backups.restores.empty')} />
      ) : (
        <ul className={layout.stack} aria-label={t('backups.restores.title')}>
          {restores.map((r) => (
            <li key={r.id}>
              <strong>
                <bdi>{r.id}</bdi>
              </strong>{' '}
              · {t(`backups.restores.modes.${r.mode}`)} · <bdi>{r.backupId}</bdi>{' '}
              <Badge tone="mock">{t(`backups.status.${r.status}`)}</Badge>
              <div className={layout.muted}>
                {r.components.map((c) => t(`backups.components.${c}`)).join(', ')} · {r.startedBy} ·{' '}
                <bdi>{fmt.dateTime(r.startedAt)}</bdi>
              </div>
              <div className={layout.muted}>{r.message}</div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function MigrationCard({ readiness }: { readiness: MigrationReadiness }) {
  const { t, fmt } = useI18n();
  return (
    <Card
      title={t('backups.migration.title')}
      caption={t('backups.migration.caption', { at: fmt.dateTime(readiness.generatedAt) })}
    >
      <div className={layout.stack} data-testid="migration">
        <p>
          {t('backups.migration.overall')}{' '}
          <Badge tone={STATUS_TONE[readiness.overall]}>
            {t(`backups.migration.status.${readiness.overall}`)}
          </Badge>{' '}
          {readiness.simulated && <Badge tone="mock">{t('common.simulated')}</Badge>}
        </p>
        <ul className={layout.stack} aria-label={t('backups.migration.title')}>
          {readiness.checks.map((c) => (
            <li key={c.id}>
              <Icon
                name={c.status === 'ready' ? 'check' : 'alert'}
                label={t(`backups.migration.status.${c.status}`)}
              />{' '}
              <strong>{t(`backups.migration.checks.${c.id as MigrationCheckId}`)}</strong>{' '}
              <Badge tone={STATUS_TONE[c.status]}>
                {t(`backups.migration.status.${c.status}`)}
              </Badge>
              <div className={layout.muted}>{c.detail}</div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

type MigrationCheckId =
  'recentBackup' | 'verified' | 'restoreTested' | 'coverage' | 'secrets' | 'capacity' | 'backend';
