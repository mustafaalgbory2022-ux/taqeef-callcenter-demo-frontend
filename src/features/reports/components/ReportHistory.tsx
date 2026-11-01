import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState, QueryView } from '@/shared/ui/States';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { useToast } from '@/shared/ui/Toaster';
import { useEmailReport, useReportHistory } from '../hooks/useReports';

/** Saved reports and the (simulated) combined management email. */
export function ReportHistory() {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const history = useReportHistory();
  const email = useEmailReport();
  const canManage = usePermission('reports.manage');

  async function send(id: string) {
    try {
      await email.mutate(id);
      toast('success', t('reports.email.simulatedSent'));
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }

  return (
    <Card title={t('reports.history.title')} caption={t('reports.history.caption')} flush>
      <QueryView query={history}>
        {(reports) =>
          reports.length === 0 ? (
            <EmptyState title={t('reports.history.empty')} />
          ) : (
            <TableRegion label={t('reports.history.title')}>
              <thead>
                <tr>
                  <th scope="col">{t('reports.title')}</th>
                  <th scope="col">{t('reports.period')}</th>
                  <th scope="col">{t('reports.history.created')}</th>
                  <th scope="col">{t('reports.email.status')}</th>
                  <th scope="col">
                    <span className="visually-hidden">{t('common.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td className={tableStyles.wrap}>{r.title}</td>
                    <td>
                      <bdi>
                        {fmt.date(r.range.from)} – {fmt.date(r.range.to)}
                      </bdi>
                    </td>
                    <td className={tableStyles.muted}>
                      <bdi>{fmt.dateTime(r.createdAt)}</bdi>
                    </td>
                    <td>
                      <Badge
                        tone={
                          r.emailStatus === 'not_sent'
                            ? 'neutral'
                            : r.emailStatus === 'sent'
                              ? 'success'
                              : 'mock'
                        }
                      >
                        {t(`reports.email.statuses.${r.emailStatus}`)}
                      </Badge>
                    </td>
                    <td>
                      {canManage && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="upload"
                          loading={email.isPending}
                          onClick={() => send(r.id)}
                        >
                          {t('reports.email.send')}
                          <span className="visually-hidden"> — {r.title}</span>
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
