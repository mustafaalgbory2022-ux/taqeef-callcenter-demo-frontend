import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Agent, DateRange, Queue, ReportPeriod } from '@/shared/types/domain';
import { Checkbox, Field } from '@/shared/ui/Field';
import { isValidRange } from '@/shared/utils/dates';
import styles from './Reports.module.css';

export interface ReportParams {
  period: ReportPeriod;
  anchor: string;
  custom: DateRange;
  queueIds: string[];
  agentIds: string[];
}

const PERIODS: ReportPeriod[] = ['weekly', 'monthly', 'yearly', 'custom'];

/** Report parameters: period (week/month/year/custom), queues and agents. */
export function ReportForm({
  value,
  onChange,
  queues,
  agents,
  range,
}: {
  value: ReportParams;
  onChange: (v: ReportParams) => void;
  queues: readonly Queue[];
  agents: readonly Agent[];
  range: DateRange;
}) {
  const { t, pick, fmt } = useI18n();
  const toggle = (list: string[], id: string, on: boolean) =>
    on ? [...list, id] : list.filter((x) => x !== id);
  return (
    <div className={styles.form}>
      <div className={styles.row}>
        <Field label={t('reports.period')}>
          {(p) => (
            <select
              {...p}
              value={value.period}
              onChange={(e) => onChange({ ...value, period: e.target.value as ReportPeriod })}
            >
              {PERIODS.map((x) => (
                <option key={x} value={x}>
                  {t(`reports.periods.${x}`)}
                </option>
              ))}
            </select>
          )}
        </Field>
        {value.period === 'custom' ? (
          <>
            <Field
              label={t('dateRange.from')}
              error={isValidRange(value.custom) ? undefined : t('reports.invalidRange')}
            >
              {(p) => (
                <input
                  {...p}
                  type="date"
                  value={value.custom.from}
                  onChange={(e) =>
                    onChange({ ...value, custom: { ...value.custom, from: e.target.value } })
                  }
                />
              )}
            </Field>
            <Field label={t('dateRange.to')}>
              {(p) => (
                <input
                  {...p}
                  type="date"
                  value={value.custom.to}
                  onChange={(e) =>
                    onChange({ ...value, custom: { ...value.custom, to: e.target.value } })
                  }
                />
              )}
            </Field>
          </>
        ) : (
          <Field
            label={t('reports.anchor')}
            hint={t('reports.resolved', { from: fmt.date(range.from), to: fmt.date(range.to) })}
          >
            {(p) => (
              <input
                {...p}
                type="date"
                value={value.anchor}
                onChange={(e) => e.target.value && onChange({ ...value, anchor: e.target.value })}
              />
            )}
          </Field>
        )}
      </div>
      <div className={styles.row}>
        <fieldset className={styles.checks}>
          <legend>{t('reports.queues')}</legend>
          {queues.map((q) => (
            <Checkbox
              key={q.id}
              checked={value.queueIds.includes(q.id)}
              onChange={(on) => onChange({ ...value, queueIds: toggle(value.queueIds, q.id, on) })}
            >
              {q.number} · {pick(q.name)}
            </Checkbox>
          ))}
        </fieldset>
        <fieldset className={styles.checks}>
          <legend>{t('reports.agents')}</legend>
          {agents.map((a) => (
            <Checkbox
              key={a.id}
              checked={value.agentIds.includes(a.id)}
              onChange={(on) => onChange({ ...value, agentIds: toggle(value.agentIds, a.id, on) })}
            >
              {a.displayName} · <bdi>{a.extension}</bdi>
            </Checkbox>
          ))}
        </fieldset>
      </div>
    </div>
  );
}
