import { useI18n } from '@/shared/i18n/I18nProvider';
import type { CallStatus } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';

const TONE = {
  uploaded: 'neutral',
  transcribing: 'accent',
  scoring: 'accent',
  scored: 'success',
  failed: 'danger',
} as const;
const ICON = {
  uploaded: 'upload',
  transcribing: 'clipboard',
  scoring: 'history',
  scored: 'check',
  failed: 'alert',
} as const;

export function CallStatusBadge({ status }: { status: CallStatus }) {
  const { t } = useI18n();
  return (
    <Badge tone={TONE[status]} icon={ICON[status]}>
      {t(`calls.status.${status}`)}
    </Badge>
  );
}
