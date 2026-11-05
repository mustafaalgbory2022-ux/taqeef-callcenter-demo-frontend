import { useI18n } from '@/shared/i18n/I18nProvider';
import type { CallStatus } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { statusGroup } from '../model/status';

const TONE = { processing: 'accent', evaluated: 'success', failed: 'danger' } as const;
const ICON = { processing: 'refresh', evaluated: 'check', failed: 'alert' } as const;

export function CallStatusBadge({ status }: { status: CallStatus }) {
  const { t } = useI18n();
  const group = statusGroup(status);
  const tone = status === 'scored' ? 'success' : group === 'evaluated' ? 'neutral' : TONE[group];
  return (
    <Badge tone={tone} icon={status === 'uploaded' ? 'upload' : ICON[group]}>
      <span data-status={status}>{t(`calls.status.${status}`)}</span>
    </Badge>
  );
}
