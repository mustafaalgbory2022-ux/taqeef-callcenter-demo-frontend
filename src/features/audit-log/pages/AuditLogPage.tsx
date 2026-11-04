import { useEffect, useState } from 'react';
import { ChangeArrow } from '@/shared/ui/ChangeArrow';
import { usePermission } from '@/shared/hooks/usePermission';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import {
  ADMIN_AUDIT_ACTIONS,
  type AdminAuditAction,
  type AdminAuditEntry,
  type AdminResource,
  type AuditQuery,
} from '@/shared/types/domain';
import { ADMIN_RESOURCES } from '@/shared/api/wire/admin';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Pagination } from '@/shared/ui/Pagination';
import { EmptyState, QueryView } from '@/shared/ui/States';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { useToast } from '@/shared/ui/Toaster';
import { downloadBlob } from '@/shared/utils/download';
import { buildXlsx } from '@/shared/utils/xlsx';
import { useAuditExport, useAuditLog } from '../hooks/useAuditLog';
import {
  AUDIT_PAGE_SIZE,
  auditSheet,
  compactQuery,
  isValidAuditRange,
  pageOf,
} from '../model/auditLog';

const RESULT_TONE: Record<AdminAuditEntry['result'], BadgeTone> = {
  success: 'success',
  failure: 'danger',
  denied: 'warning',
};

/** Searchable, filterable, read-only administration and security history with audited export. */
export function AuditLogPage() {
  const { t, fmt } = useI18n();
  useDocumentTitle(t('auditLog.title'), t('app.title'));
  const toast = useToast();
  const canView = usePermission('audit.view');
  const canExport = usePermission('audit.export');
  const [query, setQuery] = useState<AuditQuery>({});
  const [page, setPage] = useState(1);
  const q = compactQuery(query);
  const valid = isValidAuditRange(q);
  const log = useAuditLog(q, canView && valid);
  const exporter = useAuditExport();
  const { refetch } = log;
  useEffect(() => refetch(), [refetch]);

  const set = <K extends keyof AuditQuery>(k: K, v: AuditQuery[K]) => {
    setQuery((x) => ({ ...x, [k]: v }));
    setPage(1);
  };

  async function exportLog() {
    try {
      const result = await exporter.mutate(q);
      const sheet = auditSheet(
        t('auditLog.title'),
        [
          t('auditLog.cols.at'),
          t('auditLog.cols.actor'),
          t('auditLog.cols.action'),
          t('auditLog.cols.object'),
          t('auditLog.cols.objectId'),
          t('auditLog.cols.result'),
          t('auditLog.cols.correlation'),
          t('auditLog.cols.summary'),
          t('auditLog.cols.changes'),
          t('common.simulated'),
        ],
        result.entries,
      );
      downloadBlob(buildXlsx([sheet]), `taqeef-audit-${result.exportedAt.slice(0, 10)}.xlsx`);
      toast('success', t('auditLog.exported', { n: result.count }));
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }

  if (!canView) {
    return (
      <>
        <PageHeader eyebrow={t('nav.administration')} title={t('auditLog.title')} />
        <Notice tone="warning" title={t('errors.forbidden')} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={t('nav.administration')}
        title={t('auditLog.title')}
        description={t('auditLog.description')}
        actions={
          canExport && (
            <Button
              icon="arrowDown"
              loading={exporter.isPending}
              disabled={!valid}
              onClick={exportLog}
            >
              {t('auditLog.export')}
            </Button>
          )
        }
      />
      <Notice tone="mock" title={t('auditLog.syntheticTitle')}>
        {t('auditLog.syntheticBody')}
      </Notice>
      <Card
        title={t('auditLog.listTitle')}
        caption={log.data && t('auditLog.count', { n: log.data.length })}
        flush
      >
        <div className={layout.toolbar} role="search">
          <Field label={t('auditLog.filters.search')} hint={t('auditLog.filters.searchHint')}>
            {(p) => (
              <input
                {...p}
                type="search"
                value={query.search ?? ''}
                onChange={(e) => set('search', e.target.value)}
              />
            )}
          </Field>
          <Field label={t('auditLog.filters.actor')}>
            {(p) => (
              <input
                {...p}
                value={query.actor ?? ''}
                onChange={(e) => set('actor', e.target.value)}
              />
            )}
          </Field>
          <Field label={t('auditLog.filters.object')}>
            {(p) => (
              <select
                {...p}
                value={query.resource ?? ''}
                onChange={(e) =>
                  set('resource', (e.target.value || undefined) as AdminResource | undefined)
                }
              >
                <option value="">{t('auditLog.filters.all')}</option>
                {ADMIN_RESOURCES.map((r) => (
                  <option key={r} value={r}>
                    {t(`auditLog.resources.${r}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t('auditLog.filters.action')}>
            {(p) => (
              <select
                {...p}
                value={query.action ?? ''}
                onChange={(e) =>
                  set('action', (e.target.value || undefined) as AdminAuditAction | undefined)
                }
              >
                <option value="">{t('auditLog.filters.all')}</option>
                {ADMIN_AUDIT_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {t(`admin.audit.actions.${a}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t('auditLog.filters.result')}>
            {(p) => (
              <select
                {...p}
                value={query.result ?? ''}
                onChange={(e) =>
                  set(
                    'result',
                    (e.target.value || undefined) as AdminAuditEntry['result'] | undefined,
                  )
                }
              >
                <option value="">{t('auditLog.filters.all')}</option>
                {(['success', 'failure', 'denied'] as const).map((r) => (
                  <option key={r} value={r}>
                    {t(`auditLog.results.${r}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t('dateRange.from')}>
            {(p) => (
              <input
                {...p}
                type="date"
                value={query.from ?? ''}
                onChange={(e) => set('from', e.target.value || undefined)}
              />
            )}
          </Field>
          <Field label={t('dateRange.to')} error={valid ? undefined : t('auditLog.invalidRange')}>
            {(p) => (
              <input
                {...p}
                type="date"
                value={query.to ?? ''}
                onChange={(e) => set('to', e.target.value || undefined)}
              />
            )}
          </Field>
        </div>
        <QueryView query={log}>
          {(entries) =>
            entries.length === 0 ? (
              <EmptyState title={t('auditLog.empty')} />
            ) : (
              <>
                <TableRegion label={t('auditLog.listTitle')}>
                  <thead>
                    <tr>
                      <th scope="col">{t('auditLog.cols.at')}</th>
                      <th scope="col">{t('auditLog.cols.actor')}</th>
                      <th scope="col">{t('auditLog.cols.action')}</th>
                      <th scope="col">{t('auditLog.cols.object')}</th>
                      <th scope="col">{t('auditLog.cols.result')}</th>
                      <th scope="col">{t('auditLog.cols.correlation')}</th>
                      <th scope="col">{t('auditLog.cols.summary')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageOf(entries, page).map((e) => (
                      <tr key={e.id}>
                        <td className={tableStyles.muted}>
                          <bdi>{fmt.dateTime(e.at)}</bdi>
                        </td>
                        <td>{e.actor}</td>
                        <td>{t(`admin.audit.actions.${e.action}`)}</td>
                        <td className={tableStyles.wrap}>
                          {t(`auditLog.resources.${e.resource}`)}
                          {e.resourceId && (
                            <div className={tableStyles.mono}>
                              <bdi>{e.resourceId}</bdi>
                            </div>
                          )}
                        </td>
                        <td>
                          <Badge tone={RESULT_TONE[e.result]}>
                            {t(`auditLog.results.${e.result}`)}
                          </Badge>
                        </td>
                        <td className={tableStyles.mono}>
                          <bdi>{e.correlationId || '—'}</bdi>
                        </td>
                        <td className={tableStyles.wrap}>
                          <bdi>{e.summary}</bdi>
                          {e.changes.length > 0 && (
                            <details>
                              <summary>{t('auditLog.changes', { n: e.changes.length })}</summary>
                              <ul className={layout.list}>
                                {e.changes.map((c) => (
                                  <li key={c.field}>
                                    <bdi className={layout.mono}>{c.field}</bdi>:{' '}
                                    <bdi>{c.before ?? '—'}</bdi>
                                    <ChangeArrow />
                                    <bdi>{c.after ?? '—'}</bdi>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                          {e.simulated && <Badge tone="mock">{t('common.simulated')}</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableRegion>
                <Pagination
                  page={page}
                  pageSize={AUDIT_PAGE_SIZE}
                  total={entries.length}
                  onPage={setPage}
                />
              </>
            )
          }
        </QueryView>
      </Card>
      <Notice tone="info">{t('auditLog.productionNote')}</Notice>
    </>
  );
}
