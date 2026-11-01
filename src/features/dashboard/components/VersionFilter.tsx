import { useI18n } from '@/shared/i18n/I18nProvider';
import styles from './Dashboard.module.css';

/** Compare like with like: restrict dashboards to evaluations of one scorecard version. */
export function VersionFilter({
  versions,
  value,
  onChange,
}: {
  versions: readonly number[];
  value: number | null;
  onChange: (version: number | null) => void;
}) {
  const { t } = useI18n();
  return (
    <label className={styles.filter}>
      {t('dashboard.versionFilter.label')}
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">{t('dashboard.versionFilter.all')}</option>
        {versions.map((v) => (
          <option key={v} value={v}>
            v{v}
          </option>
        ))}
      </select>
    </label>
  );
}
