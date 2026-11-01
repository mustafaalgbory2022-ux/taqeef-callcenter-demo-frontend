import { useAdminAudit } from '@/shared/hooks/useAdminAudit';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { AuditTrail } from '@/shared/ui/AuditTrail';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { QueryView } from '@/shared/ui/States';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { useAiConfigVersions } from '../hooks/useAiAdmin';

/** Immutable configuration versions plus the audit log of AI administration actions. */
export function AiVersionHistory() {
  const { t, fmt } = useI18n();
  const versions = useAiConfigVersions();
  const configAudit = useAdminAudit('ai', 'ai_config');
  const jobAudit = useAdminAudit('ai', 'ai_jobs');
  return (
    <>
      <Card title={t('aiAdmin.versions.title')} caption={t('aiAdmin.versions.caption')} flush>
        <QueryView query={versions}>
          {(list) => (
            <TableRegion label={t('aiAdmin.versions.title')}>
              <thead>
                <tr>
                  <th scope="col">{t('aiAdmin.versions.version')}</th>
                  <th scope="col">{t('aiAdmin.versions.note')}</th>
                  <th scope="col">{t('aiAdmin.versions.by')}</th>
                  <th scope="col">{t('aiAdmin.versions.at')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((v, i) => (
                  <tr key={v.version}>
                    <td>
                      <bdi>v{v.version}</bdi>{' '}
                      {i === 0 && <Badge tone="accent">{t('aiAdmin.versions.current')}</Badge>}
                    </td>
                    <td className={tableStyles.wrap}>{v.changeNote}</td>
                    <td>{v.createdBy}</td>
                    <td className={tableStyles.muted}>
                      <bdi>{fmt.dateTime(v.createdAt)}</bdi>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableRegion>
          )}
        </QueryView>
      </Card>
      <Card title={t('aiAdmin.versions.auditTitle')} caption={t('admin.audit.caption')}>
        <AuditTrail query={configAudit} limit={6} />
      </Card>
      <Card title={t('aiAdmin.versions.jobAuditTitle')} caption={t('admin.audit.caption')}>
        <AuditTrail query={jobAudit} limit={6} />
      </Card>
    </>
  );
}
