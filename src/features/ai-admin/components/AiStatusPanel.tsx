import { useI18n } from '@/shared/i18n/I18nProvider';
import type { AiModel, AiServiceState } from '@/shared/types/domain';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { layout } from '@/shared/ui/layout';
import { QueryView } from '@/shared/ui/States';
import { useAiStatus } from '../hooks/useAiAdmin';

const TONE: Record<AiServiceState, BadgeTone> = {
  ready: 'success',
  loading: 'warning',
  degraded: 'warning',
  offline: 'danger',
};

export function AiStatusPanel({ models }: { models: readonly AiModel[] }) {
  const { t, fmt } = useI18n();
  const status = useAiStatus();
  return (
    <Card
      title={t('aiAdmin.status.title')}
      caption={status.data && t('aiAdmin.status.caption', { v: status.data.configVersion })}
    >
      <QueryView query={status} rows={2}>
        {(s) => (
          <div className={layout.stack} data-testid="ai-status">
            <dl className={layout.facts}>
              {s.services.map((svc) => (
                <div key={svc.kind} className={layout.factRow}>
                  <dt>{t(`aiAdmin.kinds.${svc.kind}`)}</dt>
                  <dd>
                    <Badge tone={TONE[svc.state]} icon={svc.state === 'ready' ? 'check' : 'alert'}>
                      {t(`aiAdmin.status.states.${svc.state}`)}
                    </Badge>{' '}
                    <bdi>{models.find((m) => m.id === svc.modelId)?.name ?? svc.modelId}</bdi>
                    <div className={layout.muted}>{svc.message}</div>
                  </dd>
                </div>
              ))}
            </dl>
            <p className={layout.muted}>
              {s.simulated && <Badge tone="mock">{t('common.simulated')}</Badge>}{' '}
              {t('aiAdmin.status.checked', { at: fmt.dateTime(s.generatedAt) })}
            </p>
          </div>
        )}
      </QueryView>
    </Card>
  );
}
