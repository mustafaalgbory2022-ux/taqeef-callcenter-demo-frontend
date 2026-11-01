import { useI18n } from '@/shared/i18n/I18nProvider';
import type { ReviewStatus } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';

const TONE = { unreviewed: 'neutral', reviewed: 'success', needs_follow_up: 'warning' } as const;
const ICON = { unreviewed: 'minus', reviewed: 'check', needs_follow_up: 'flag' } as const;

export function ReviewBadge({ status }: { status: ReviewStatus }) {
  const { t } = useI18n();
  return (
    <Badge tone={TONE[status]} icon={ICON[status]}>
      {t(`calls.review.status.${status}`)}
    </Badge>
  );
}
