import { useState } from 'react';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type {
  DateRange,
  PbxConnectionState,
  PbxConnector,
  PbxTestResult,
  PbxTestStepResult,
  PbxVendorInfo,
} from '@/shared/types/domain';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { EmptyState, QueryView } from '@/shared/ui/States';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { useToast } from '@/shared/ui/Toaster';
import { addDays, todayISO } from '@/shared/utils/dates';
import { MAX_SYNC_DAYS } from '@/shared/utils/pbxRules';
import { usePbxSyncs, useSetIngestion, useStartSync, useTestConnector } from '../hooks/usePbxAdmin';
import { validateSyncRange } from '../model/pbx';
import { vendorAdapter } from '../vendors';

const STATE_TONE: Record<PbxConnectionState, BadgeTone> = {
  not_configured: 'warning',
  configured: 'accent',
  connected: 'success',
  error: 'danger',
  disabled: 'neutral',
};
const STEP_TONE: Record<PbxTestStepResult, BadgeTone> = {
  passed: 'success',
  failed: 'danger',
  skipped: 'neutral',
};

/** Connection status and the (simulated) connection test. */
export function ConnectionStatusCard({ connector }: { connector: PbxConnector }) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const canManage = usePermission('pbx.manage');
  const test = useTestConnector();
  const [result, setResult] = useState<PbxTestResult | null>(null);

  async function run() {
    try {
      const r = await test.mutate(connector.id);
      setResult(r);
      toast(
        r.ok ? 'success' : 'error',
        t(r.ok ? 'pbxAdmin.status.testPassed' : 'pbxAdmin.status.testFailed'),
      );
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }

  return (
    <Card
      title={t('pbxAdmin.status.title')}
      caption={connector.name}
      actions={
        canManage && (
          <Button icon="plug" loading={test.isPending} onClick={run}>
            {t('pbxAdmin.status.test')}
          </Button>
        )
      }
    >
      <div className={layout.stack} data-testid="pbx-status">
        <dl className={layout.facts}>
          <dt>{t('pbxAdmin.status.state')}</dt>
          <dd>
            <Badge tone={STATE_TONE[connector.state]}>
              {t(`pbxAdmin.states.${connector.state}`)}
            </Badge>{' '}
            {connector.simulated && <Badge tone="mock">{t('common.simulated')}</Badge>}
            <div className={layout.muted}>{connector.stateMessage}</div>
          </dd>
          <dt>{t('pbxAdmin.status.checked')}</dt>
          <dd>
            <bdi>{connector.checkedAt ? fmt.dateTime(connector.checkedAt) : '—'}</bdi>
          </dd>
          <dt>{t('pbxAdmin.status.ingestion')}</dt>
          <dd>{t(connector.enabled ? 'pbxAdmin.ingestion.on' : 'pbxAdmin.ingestion.off')}</dd>
          <dt>{t('pbxAdmin.status.lastSync')}</dt>
          <dd>
            {connector.lastSync ? (
              <bdi>
                {connector.lastSync.from} – {connector.lastSync.to} ·{' '}
                {fmt.dateTime(connector.lastSync.startedAt)}
              </bdi>
            ) : (
              '—'
            )}
          </dd>
        </dl>
        {result && (
          <div data-testid="pbx-test-result">
            <p>
              <strong>
                {t(result.ok ? 'pbxAdmin.status.testPassed' : 'pbxAdmin.status.testFailed')}
              </strong>{' '}
              {result.simulated && <Badge tone="mock">{t('common.simulated')}</Badge>}
            </p>
            <ul className={layout.list}>
              {result.steps.map((s) => (
                <li key={s.step}>
                  <Badge tone={STEP_TONE[s.result]}>{t(`pbxAdmin.steps.${s.result}`)}</Badge>{' '}
                  {t(`pbxAdmin.steps.names.${s.step}`)} — {s.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

/** Ingestion on/off, manual synchronization and synchronization history. */
export function IngestionCard({ connector }: { connector: PbxConnector }) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const canManage = usePermission('pbx.manage');
  const setIngestion = useSetIngestion();
  const startSync = useStartSync();
  const syncs = usePbxSyncs(connector.id);
  const today = todayISO();
  const [range, setRange] = useState<DateRange>({ from: addDays(today, -6), to: today });
  const [confirmToggle, setConfirmToggle] = useState(false);
  const rangeError = validateSyncRange(range, connector.ingestionStartDate, today);

  async function sync() {
    try {
      const run = await startSync.mutate({ id: connector.id, range });
      toast('success', t('pbxAdmin.ingestion.synced', { n: run.cdrRecords }));
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }

  return (
    <Card title={t('pbxAdmin.ingestion.title')} caption={t('pbxAdmin.ingestion.caption')} flush>
      <div className={layout.toolbar}>
        <span>
          <Badge
            tone={connector.enabled ? 'success' : 'neutral'}
            icon={connector.enabled ? 'play' : 'pause'}
          >
            {t(connector.enabled ? 'pbxAdmin.ingestion.on' : 'pbxAdmin.ingestion.off')}
          </Badge>
        </span>
        {canManage && (
          <Button
            variant={connector.enabled ? 'danger' : 'primary'}
            disabled={!connector.enabled && connector.state === 'not_configured'}
            onClick={() => setConfirmToggle(true)}
          >
            {t(connector.enabled ? 'pbxAdmin.ingestion.disable' : 'pbxAdmin.ingestion.enable')}
          </Button>
        )}
        {!connector.enabled && connector.state === 'not_configured' && (
          <span className={layout.muted}>{t('pbxAdmin.ingestion.needsConfig')}</span>
        )}
      </div>
      {canManage && (
        <div className={layout.toolbar}>
          <Field label={t('dateRange.from')}>
            {(p) => (
              <input
                {...p}
                type="date"
                min={connector.ingestionStartDate}
                max={today}
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
            )}
          </Field>
          <Field label={t('dateRange.to')}>
            {(p) => (
              <input
                {...p}
                type="date"
                max={today}
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              />
            )}
          </Field>
          <Button
            icon="refresh"
            loading={startSync.isPending}
            disabled={!connector.enabled || rangeError !== null}
            onClick={sync}
          >
            {t('pbxAdmin.ingestion.sync')}
          </Button>
          {rangeError && (
            <span className={layout.muted} role="status">
              {t(`pbxAdmin.ingestion.rangeErrors.${rangeError}`, {
                start: connector.ingestionStartDate,
                max: MAX_SYNC_DAYS,
              })}
            </span>
          )}
        </div>
      )}
      <QueryView query={syncs}>
        {(runs) =>
          runs.length === 0 ? (
            <EmptyState title={t('pbxAdmin.ingestion.empty')} />
          ) : (
            <TableRegion label={t('pbxAdmin.ingestion.history')}>
              <thead>
                <tr>
                  <th scope="col">{t('pbxAdmin.ingestion.range')}</th>
                  <th scope="col">{t('pbxAdmin.ingestion.status')}</th>
                  <th scope="col">{t('pbxAdmin.ingestion.cdr')}</th>
                  <th scope="col">{t('pbxAdmin.ingestion.recordings')}</th>
                  <th scope="col">{t('pbxAdmin.ingestion.statDays')}</th>
                  <th scope="col">{t('pbxAdmin.ingestion.started')}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <bdi>
                        {r.from} – {r.to}
                      </bdi>
                    </td>
                    <td className={tableStyles.wrap}>
                      <Badge
                        tone={
                          r.status === 'failed'
                            ? 'danger'
                            : r.status === 'simulated'
                              ? 'mock'
                              : 'success'
                        }
                      >
                        {t(`pbxAdmin.syncStatus.${r.status}`)}
                      </Badge>
                      <div className={tableStyles.muted}>{r.message}</div>
                    </td>
                    <td>
                      <bdi>{r.cdrRecords}</bdi>
                    </td>
                    <td>
                      <bdi>{r.recordings}</bdi>
                    </td>
                    <td>
                      <bdi>{r.queueStatDays}</bdi>
                    </td>
                    <td className={tableStyles.muted}>
                      {r.startedBy} · <bdi>{fmt.dateTime(r.startedAt)}</bdi>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableRegion>
          )
        }
      </QueryView>
      {confirmToggle && (
        <ConfirmDialog
          title={t(
            connector.enabled
              ? 'pbxAdmin.ingestion.disableTitle'
              : 'pbxAdmin.ingestion.enableTitle',
          )}
          confirmLabel={t(
            connector.enabled ? 'pbxAdmin.ingestion.disable' : 'pbxAdmin.ingestion.enable',
          )}
          tone={connector.enabled ? 'danger' : 'primary'}
          onClose={() => setConfirmToggle(false)}
          onConfirm={async () => {
            await setIngestion.mutate({ id: connector.id, enabled: !connector.enabled });
            toast(
              'success',
              t(
                connector.enabled
                  ? 'pbxAdmin.ingestion.disabledToast'
                  : 'pbxAdmin.ingestion.enabledToast',
              ),
            );
            setConfirmToggle(false);
          }}
        >
          <p>
            {t(
              connector.enabled
                ? 'pbxAdmin.ingestion.disableBody'
                : 'pbxAdmin.ingestion.enableBody',
            )}
          </p>
        </ConfirmDialog>
      )}
    </Card>
  );
}

/** Vendor adapters reported by the backend and whether this frontend has a settings form. */
export function VendorsCard({ vendors }: { vendors: readonly PbxVendorInfo[] }) {
  const { t } = useI18n();
  return (
    <Card title={t('pbxAdmin.vendors.title')} caption={t('pbxAdmin.vendors.caption')}>
      <ul className={layout.stack} aria-label={t('pbxAdmin.vendors.title')}>
        {vendors.map((v) => (
          <li key={v.id}>
            <strong>{v.name}</strong>{' '}
            <Badge tone={v.status === 'supported' ? 'success' : 'neutral'}>
              {t(`pbxAdmin.vendors.${v.status}`)}
            </Badge>{' '}
            {!vendorAdapter(v.id) && <Badge>{t('pbxAdmin.vendors.noForm')}</Badge>}
            <div className={layout.muted}>
              {v.capabilities.map((c) => t(`pbxAdmin.capabilities.${c}`)).join(' · ')}
            </div>
          </li>
        ))}
      </ul>
      <Notice tone="info">{t('pbxAdmin.vendors.note')}</Notice>
    </Card>
  );
}
