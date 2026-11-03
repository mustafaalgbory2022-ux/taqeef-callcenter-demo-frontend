import { useState } from 'react';
import { Link } from 'react-router';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type {
  ErrorSeverity,
  ServiceId,
  SystemErrorQuery,
  SystemHealth,
} from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Checkbox, Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { EmptyState, QueryView } from '@/shared/ui/States';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { useToast } from '@/shared/ui/Toaster';
import { UsageMeter } from '@/shared/ui/UsageMeter';
import { usedPct } from '@/shared/utils/storageRules';
import { useAcknowledge, useSystemErrors } from '../hooks/useSystem';
import { errorSummary, HEALTH_TONE, resourceGauges, SEVERITY_TONE } from '../model/system';

const SERVICES: readonly ServiceId[] = [
  'api',
  'database',
  'transcription_worker',
  'evaluation_worker',
  'pbx_ingestion',
  'email_delivery',
  'scheduler',
];

export function ServicesCard({ health }: { health: SystemHealth }) {
  const { t, fmt } = useI18n();
  return (
    <Card
      title={t('system.services.title')}
      caption={t('system.services.caption', { at: fmt.dateTime(health.generatedAt) })}
    >
      <ul className={layout.grid} aria-label={t('system.services.title')} data-testid="services">
        {health.services.map((s) => (
          <li key={s.id}>
            <strong>{t(`system.services.names.${s.id}`)}</strong>{' '}
            <Badge tone={HEALTH_TONE[s.state]}>{t(`system.health.${s.state}`)}</Badge>
            {s.latencyMs !== null && (
              <span className={layout.muted}>
                {' '}
                · <bdi>{s.latencyMs} ms</bdi>
              </span>
            )}
            <div className={layout.muted}>{s.detail}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ResourcesCard({ health }: { health: SystemHealth }) {
  const { t, fmt } = useI18n();
  const gpu = health.resources.gpus[0];
  return (
    <Card
      title={t('system.resources.title')}
      caption={gpu ? gpu.name : t('system.resources.noGpu')}
    >
      <div className={layout.stack} data-testid="resources">
        {resourceGauges(health).map((g) => (
          <UsageMeter
            key={g.key}
            label={t(`system.resources.${g.key}`)}
            pct={g.pct}
            status={g.status}
            valueText={
              g.key === 'cpu' || g.key === 'gpuUtil'
                ? `${fmt.number(g.used)} %`
                : t('system.resources.of', { used: fmt.number(g.used), total: fmt.number(g.total) })
            }
          />
        ))}
        {gpu && (
          <p className={layout.muted}>
            {t('system.resources.temperature', { c: gpu.temperatureC })}
          </p>
        )}
        {health.resources.disks.map((d) => (
          <UsageMeter
            key={d.volumeId}
            label={t('system.resources.disk', { name: d.name })}
            pct={usedPct(d.usedGb, d.totalGb)}
            status={d.status}
            valueText={
              d.status === 'unavailable'
                ? t('storage.overview.unavailable')
                : t('system.resources.of', {
                    used: fmt.number(d.usedGb),
                    total: fmt.number(d.totalGb),
                  })
            }
          />
        ))}
      </div>
    </Card>
  );
}

export function WorkersCard({ health }: { health: SystemHealth }) {
  const { t, fmt } = useI18n();
  return (
    <Card
      title={t('system.workers.title')}
      caption={t('system.workers.caption', {
        q: health.queue.queued,
        r: health.queue.running,
        f: health.queue.failed,
      })}
    >
      <TableRegion label={t('system.workers.title')}>
        <thead>
          <tr>
            <th scope="col">{t('system.workers.worker')}</th>
            <th scope="col">{t('system.workers.state')}</th>
            <th scope="col">{t('system.workers.job')}</th>
            <th scope="col">{t('system.workers.heartbeat')}</th>
          </tr>
        </thead>
        <tbody>
          {health.workers.map((w) => (
            <tr key={w.id}>
              <td>
                {t(`aiAdmin.jobs.stages.${w.kind}`)} <bdi className={tableStyles.mono}>{w.id}</bdi>
              </td>
              <td>
                <Badge
                  tone={
                    w.state === 'busy'
                      ? 'accent'
                      : w.state === 'idle'
                        ? 'success'
                        : w.state === 'stopped'
                          ? 'warning'
                          : 'danger'
                  }
                >
                  {t(`system.workers.states.${w.state}`)}
                </Badge>
              </td>
              <td className={tableStyles.mono}>
                <bdi>{w.currentJobId ?? '—'}</bdi>
              </td>
              <td className={tableStyles.muted}>
                <bdi>{fmt.dateTime(w.heartbeatAt)}</bdi>
              </td>
            </tr>
          ))}
        </tbody>
      </TableRegion>
    </Card>
  );
}

export function IntegrationsCard({ health }: { health: SystemHealth }) {
  const { t, fmt } = useI18n();
  return (
    <Card title={t('system.integrations.title')} caption={t('system.integrations.caption')}>
      <dl className={layout.facts}>
        <dt>{t('system.integrations.pbx')}</dt>
        <dd>
          <Badge
            tone={
              health.pbx.state === 'connected' || health.pbx.state === 'configured'
                ? 'success'
                : 'warning'
            }
          >
            {t(`pbxAdmin.states.${health.pbx.state}`)}
          </Badge>{' '}
          {t(health.pbx.enabled ? 'pbxAdmin.ingestion.on' : 'pbxAdmin.ingestion.off')} ·{' '}
          {t('system.integrations.lastSync', {
            at: health.pbx.lastSyncAt ? fmt.dateTime(health.pbx.lastSyncAt) : '—',
          })}{' '}
          <Link to="/admin/pbx">{t('system.integrations.open')}</Link>
        </dd>
        <dt>{t('system.integrations.email')}</dt>
        <dd>
          <Badge
            tone={
              health.email.state === 'not_configured' || health.email.state === 'error'
                ? 'warning'
                : 'success'
            }
          >
            {t(`notifications.sender.states.${health.email.state}`)}
          </Badge>{' '}
          {t('system.integrations.deliveries', {
            f: health.email.failed24h,
            s: health.email.simulated24h,
          })}{' '}
          <Link to="/admin/notifications">{t('system.integrations.open')}</Link>
        </dd>
      </dl>
    </Card>
  );
}

/** Admin-only structured error dashboard. Messages are sanitized (no secrets, codes or content). */
export function ErrorsCard() {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const canAck = usePermission('system.view');
  const [q, setQ] = useState<SystemErrorQuery>({});
  const errors = useSystemErrors(q);
  const ack = useAcknowledge();
  const summary = errorSummary(errors.data ?? []);
  return (
    <Card title={t('system.errors.title')} caption={t('system.errors.caption', summary)} flush>
      <div className={layout.toolbar} role="search">
        <Field label={t('system.errors.severity')}>
          {(p) => (
            <select
              {...p}
              value={q.severity ?? ''}
              onChange={(e) =>
                setQ((x) => ({
                  ...x,
                  severity: (e.target.value || undefined) as ErrorSeverity | undefined,
                }))
              }
            >
              <option value="">{t('auditLog.filters.all')}</option>
              {(['critical', 'error', 'warning'] as const).map((s) => (
                <option key={s} value={s}>
                  {t(`system.errors.severities.${s}`)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t('system.errors.service')}>
          {(p) => (
            <select
              {...p}
              value={q.service ?? ''}
              onChange={(e) =>
                setQ((x) => ({
                  ...x,
                  service: (e.target.value || undefined) as ServiceId | undefined,
                }))
              }
            >
              <option value="">{t('auditLog.filters.all')}</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {t(`system.services.names.${s}`)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t('system.errors.search')} hint={t('system.errors.searchHint')}>
          {(p) => (
            <input
              {...p}
              type="search"
              value={q.search ?? ''}
              onChange={(e) => setQ((x) => ({ ...x, search: e.target.value }))}
            />
          )}
        </Field>
        <Checkbox
          checked={q.includeAcknowledged === true}
          onChange={(on) => setQ((x) => ({ ...x, includeAcknowledged: on }))}
        >
          {t('system.errors.showAcknowledged')}
        </Checkbox>
      </div>
      <QueryView query={errors}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState title={t('system.errors.empty')} />
          ) : (
            <TableRegion label={t('system.errors.title')}>
              <thead>
                <tr>
                  <th scope="col">{t('auditLog.cols.at')}</th>
                  <th scope="col">{t('system.errors.severity')}</th>
                  <th scope="col">{t('system.errors.service')}</th>
                  <th scope="col">{t('system.errors.message')}</th>
                  <th scope="col">{t('auditLog.cols.correlation')}</th>
                  <th scope="col">{t('system.errors.count')}</th>
                  <th scope="col">
                    <span className="visually-hidden">{t('common.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id} data-testid={`error-${e.id}`}>
                    <td className={tableStyles.muted}>
                      <bdi>{fmt.dateTime(e.at)}</bdi>
                    </td>
                    <td>
                      <Badge tone={SEVERITY_TONE[e.severity]}>
                        {t(`system.errors.severities.${e.severity}`)}
                      </Badge>
                    </td>
                    <td>{t(`system.services.names.${e.service}`)}</td>
                    <td className={tableStyles.wrap}>
                      <bdi className={tableStyles.mono}>{e.code}</bdi>
                      <div>
                        <bdi>{e.message}</bdi>
                      </div>
                      {e.acknowledged && (
                        <div className={tableStyles.muted}>
                          {t('system.errors.acknowledgedBy', { by: e.acknowledgedBy ?? '—' })}
                        </div>
                      )}
                    </td>
                    <td className={tableStyles.mono}>
                      <Link to={`/admin/audit`} title={t('system.errors.correlationHint')}>
                        <bdi>{e.correlationId}</bdi>
                      </Link>
                    </td>
                    <td>
                      <bdi>{e.count}</bdi>
                    </td>
                    <td>
                      {canAck && !e.acknowledged && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="check"
                          onClick={async () => {
                            try {
                              await ack.mutate(e.id);
                              toast('success', t('system.errors.acknowledged', { code: e.code }));
                            } catch (err) {
                              toast('error', describeError(err, t));
                            }
                          }}
                        >
                          {t('system.errors.acknowledge')}
                          <span className="visually-hidden"> — {e.code}</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableRegion>
          )
        }
      </QueryView>
    </Card>
  );
}
