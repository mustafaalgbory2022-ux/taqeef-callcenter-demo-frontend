import { useI18n } from '@/shared/i18n/I18nProvider';
import { Card } from '@/shared/ui/Card';
import { LineChart } from '@/shared/ui/charts/LineChart';
import type { WeeklyQuality } from '../model/aggregate';

/** Weekly pooled quality score (0–10) with the low-score threshold as reference. */
export function QualityTrend({
  weekly,
  threshold,
}: {
  weekly: readonly WeeklyQuality[];
  threshold: number;
}) {
  const { t, fmt } = useI18n();
  return (
    <Card title={t('dashboard.trends.quality')} caption={t('dashboard.trends.qualityCaption')}>
      <LineChart
        title={t('dashboard.trends.quality')}
        points={weekly.map((w) => ({ label: fmt.date(w.week), value: w.averageScore }))}
        formatValue={(v) => fmt.score(v)}
        min={0}
        max={10}
        reference={{
          value: threshold,
          label: t('dashboard.trends.threshold', { v: fmt.score(threshold) }),
        }}
      />
    </Card>
  );
}
