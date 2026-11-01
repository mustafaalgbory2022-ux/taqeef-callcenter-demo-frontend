import { usePbxMetrics } from '@/shared/hooks/usePbxMetrics';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { DateRange } from '@/shared/types/domain';
import { QueryView } from '@/shared/ui/States';
import { StatTile } from '@/shared/ui/StatTile';
import { summarizeAgent } from '@/shared/utils/pbx';
import { formatDuration } from '@/shared/utils/time';
import styles from './Dashboard.module.css';

/** Agent-level PBX figures. SLA is a queue metric, so it is not shown per agent. */
export function AgentPbxRow({ agentId, range }: { agentId: string; range: DateRange }) {
  const { t, fmt } = useI18n();
  const pbx = usePbxMetrics(range, null);
  return (
    <QueryView query={pbx} rows={2}>
      {(data) => {
        const s = summarizeAgent(data.agentDaily.filter((r) => r.agentId === agentId));
        return (
          <section
            className={styles.kpis}
            aria-label={t('dashboard.pbx.title')}
            data-testid="agent-pbx"
          >
            <StatTile
              label={t('dashboard.pbx.answered')}
              value={fmt.integer(s.answered)}
              footnote={data.simulated ? t('dashboard.pbx.simulatedShort') : undefined}
            />
            <StatTile
              label={t('dashboard.pbx.agentMissed')}
              value={fmt.integer(s.missed)}
              footnote={t('dashboard.pbx.agentMissedNote')}
            />
            <StatTile
              label={t('dashboard.pbx.avgTalk')}
              value={s.avgTalkS === null ? '—' : formatDuration(s.avgTalkS * 1000)}
            />
          </section>
        );
      }}
    </QueryView>
  );
}
