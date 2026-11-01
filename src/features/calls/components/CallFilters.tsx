import { CALL_REASONS } from '@/shared/api/wire/calls';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { CallQuery } from '@/shared/types/domain';
import { REVIEW_STATUSES, SCORE_BANDS } from '../hooks/useCallFilters';
import styles from './CallFilters.module.css';

type Update = (patch: Partial<Record<keyof CallQuery, string | number | null>>) => void;

/** Reason, score band, review status and search filters (date/queue/agent filters are shared). */
export function CallFilters({ query, update }: { query: CallQuery; update: Update }) {
  const { t } = useI18n();
  return (
    <>
      <label className={styles.field}>
        {t('calls.filters.reason')}
        <select
          value={query.reason ?? ''}
          onChange={(e) => update({ reason: e.target.value || null })}
        >
          <option value="">{t('calls.filters.any')}</option>
          {CALL_REASONS.map((r) => (
            <option key={r} value={r}>
              {t(`insights.reasons.${r}`)}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        {t('calls.filters.score')}
        <select
          value={query.scoreBand ?? ''}
          onChange={(e) => update({ scoreBand: e.target.value || null })}
        >
          <option value="">{t('calls.filters.any')}</option>
          {SCORE_BANDS.map((b) => (
            <option key={b} value={b}>
              {t(`calls.filters.bands.${b}`)}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        {t('calls.review.label')}
        <select
          value={query.reviewStatus ?? ''}
          onChange={(e) => update({ reviewStatus: e.target.value || null })}
        >
          <option value="">{t('calls.filters.any')}</option>
          {REVIEW_STATUSES.map((r) => (
            <option key={r} value={r}>
              {t(`calls.review.status.${r}`)}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        {t('calls.filters.search')}
        <input
          type="search"
          defaultValue={query.search ?? ''}
          placeholder={t('calls.filters.searchPlaceholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') update({ search: e.currentTarget.value.trim() || null });
          }}
          onBlur={(e) => update({ search: e.currentTarget.value.trim() || null })}
        />
      </label>
    </>
  );
}
