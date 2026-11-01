import { useI18n } from '@/shared/i18n/I18nProvider';
import type { CallStatus } from '@/shared/types/domain';
import { Card } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { Notice } from '@/shared/ui/Notice';
import styles from './ProcessingStatus.module.css';

const STEPS = ['uploaded', 'transcribing', 'scoring', 'scored'] as const;

/** Pipeline progress for an uploaded call. Simulated in mock mode; real in live mode. */
export function ProcessingStatus({
  status,
  simulated,
}: {
  status: CallStatus;
  simulated: boolean;
}) {
  const { t } = useI18n();
  const index = STEPS.indexOf(status as (typeof STEPS)[number]);
  return (
    <Card
      title={t('calls.processing.title')}
      caption={simulated ? t('calls.processing.simulated') : undefined}
    >
      {status === 'failed' ? (
        <Notice tone="danger" title={t('calls.processing.failed')} />
      ) : (
        <ol className={styles.steps} aria-live="polite">
          {STEPS.map((step, i) => {
            const state = i < index ? 'done' : i === index ? 'current' : 'todo';
            return (
              <li
                key={step}
                className={`${styles.step} ${state === 'done' ? styles.done : state === 'current' ? styles.current : ''}`}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                <Icon
                  name={state === 'done' ? 'check' : state === 'current' ? 'refresh' : 'minus'}
                  size={14}
                />
                {t(`calls.status.${step}`)}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
