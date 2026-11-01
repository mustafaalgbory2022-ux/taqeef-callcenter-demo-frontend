import { AgentFilter, QueueFilter } from '@/features/agents';
import { useDateRangeParam } from '@/shared/hooks/useDateRangeParam';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePermission } from '@/shared/hooks/usePermission';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { LinkButton } from '@/shared/ui/Button';
import { DateRangeFilter } from '@/shared/ui/DateRangeFilter';
import { PageHeader } from '@/shared/ui/PageHeader';
import { CallFilters } from '../components/CallFilters';
import { CallsCard } from '../components/CallsCard';
import { useCallFilters } from '../hooks/useCallFilters';
import styles from './CallDetail.module.css';

export function CallsPage() {
  const { t } = useI18n();
  useDocumentTitle(t('calls.page.title'), t('app.title'));
  const [range, setRange] = useDateRangeParam();
  const [query, update] = useCallFilters();
  const canUpload = usePermission('calls.upload');
  return (
    <>
      <PageHeader
        eyebrow={t('nav.operations')}
        title={t('calls.page.title')}
        description={t('calls.page.description')}
        actions={
          canUpload && (
            <LinkButton variant="primary" icon="upload" to="/calls/upload">
              {t('calls.upload.open')}
            </LinkButton>
          )
        }
      />
      <div className={styles.filters} role="search" aria-label={t('calls.filters.label')}>
        <DateRangeFilter value={range} onChange={setRange} />
        <QueueFilter />
        <AgentFilter />
        <CallFilters query={query} update={update} />
      </div>
      <CallsCard query={query} onPage={(page) => update({ page })} />
    </>
  );
}
