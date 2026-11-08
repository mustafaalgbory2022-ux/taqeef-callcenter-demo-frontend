import { Link } from 'react-router';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Agent } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import styles from './Dashboard.module.css';

/**
 * Links to individual agent pages, alphabetical, with NO figures: comparative agent tables,
 * rankings and score sorting are prohibited (contract v0.2.1 §B). Each agent's own average is
 * shown only on that agent's page.
 */
export function AgentBreakdown({ agents }: { agents: readonly Agent[] }) {
  const { t } = useI18n();
  return (
    <Card title={t('dashboard.agents.title')} caption={t('dashboard.agents.caption')}>
      <ul className={styles.agentLinks} aria-label={t('dashboard.agents.title')}>
        {agents.map((agent) => (
          <li key={agent.id}>
            <Link to={`/agents/${encodeURIComponent(agent.id)}`}>{agent.displayName}</Link>{' '}
            {agent.status === 'retired' && <Badge>{t('agents.status.retired')}</Badge>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
