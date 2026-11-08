import { useI18n } from '@/shared/i18n/I18nProvider';
import { useAgentParam } from '../hooks/useAgentParam';
import { useAgents } from '../hooks/useAgentData';
import { sortAgents } from '../model/agents';
import styles from './AgentFilter.module.css';

/**
 * "All agents" or one agent, stored in the URL. A native <select> keeps it keyboard- and
 * screen-reader-friendly and scales to any number of agents (≥ 7).
 */
export function AgentFilter() {
  const { t } = useI18n();
  const [agentId, setAgentId] = useAgentParam();
  const agents = useAgents({ includeRetired: true });
  const list = agents.status === 'success' ? sortAgents(agents.data) : [];
  const active = list.filter((a) => a.status === 'active');
  const inactive = list.filter((a) => a.status === 'retired');

  return (
    <label className={styles.filter}>
      {t('agents.filter.label')}
      <select
        className={styles.select}
        value={agentId ?? ''}
        onChange={(e) => setAgentId(e.target.value || null)}
        disabled={agents.status !== 'success'}
      >
        <option value="">{t('agents.filter.all')}</option>
        {active.map((a) => (
          <option key={a.id} value={a.id}>
            {a.displayName}
          </option>
        ))}
        {inactive.length > 0 && (
          <optgroup label={t('agents.filter.inactiveGroup')}>
            {inactive.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </label>
  );
}
