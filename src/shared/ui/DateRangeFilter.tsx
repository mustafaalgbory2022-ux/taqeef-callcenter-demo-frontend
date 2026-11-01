import { useI18n } from '@/shared/i18n/I18nProvider';
import type { DateRange } from '@/shared/types/domain';
import { isValidRange, presetRange, todayISO, type RangePreset } from '@/shared/utils/dates';
import styles from './DateRangeFilter.module.css';

const PRESETS: RangePreset[] = ['last7', 'last30', 'last90', 'thisMonth', 'lastMonth', 'thisYear'];

/** Preset + custom from/to date range. Invalid custom ranges are ignored until fixed. */
export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const { t } = useI18n();
  const today = todayISO();
  const active = PRESETS.find((p) => {
    const r = presetRange(p, today);
    return r.from === value.from && r.to === value.to;
  });
  const setPart = (part: keyof DateRange, v: string) => {
    const next = { ...value, [part]: v };
    if (isValidRange(next)) onChange(next);
  };
  return (
    <div className={styles.filter} role="group" aria-label={t('dateRange.label')}>
      <label className={styles.field}>
        {t('dateRange.preset')}
        <select
          value={active ?? 'custom'}
          onChange={(e) =>
            e.target.value !== 'custom' &&
            onChange(presetRange(e.target.value as RangePreset, today))
          }
        >
          {PRESETS.map((p) => (
            <option key={p} value={p}>
              {t(`dateRange.presets.${p}`)}
            </option>
          ))}
          <option value="custom">{t('dateRange.presets.custom')}</option>
        </select>
      </label>
      <label className={styles.field}>
        {t('dateRange.from')}
        <input
          type="date"
          value={value.from}
          max={value.to}
          onChange={(e) => setPart('from', e.target.value)}
        />
      </label>
      <label className={styles.field}>
        {t('dateRange.to')}
        <input
          type="date"
          value={value.to}
          min={value.from}
          onChange={(e) => setPart('to', e.target.value)}
        />
      </label>
    </div>
  );
}
