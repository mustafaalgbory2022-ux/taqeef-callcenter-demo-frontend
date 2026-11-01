import { useI18n } from '@/shared/i18n/I18nProvider';
import { useQueues } from '../hooks/useAgentData';
import { useQueueParam } from '../hooks/useQueueParam';
import styles from './AgentFilter.module.css';

/** "All queues" or one Yeastar queue (e.g. 6001 Sales, 6002 After-Sales), stored in the URL. */
export function QueueFilter() {
  const { t, pick } = useI18n();
  const [queueId, setQueueId] = useQueueParam();
  const queues = useQueues();
  return (
    <label className={styles.filter}>
      {t('queues.filter.label')}
      <select
        className={styles.select}
        value={queueId ?? ''}
        onChange={(e) => setQueueId(e.target.value || null)}
        disabled={queues.status !== 'success'}
      >
        <option value="">{t('queues.filter.all')}</option>
        {queues.data?.map((q) => (
          <option key={q.id} value={q.id}>
            {q.number} · {pick(q.name)}
          </option>
        ))}
      </select>
    </label>
  );
}
