import { Link } from 'react-router';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Agent, AudioSample, DateRange } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { formatDuration } from '@/shared/utils/time';
import { useAudioSample } from '../hooks/useReports';
import styles from './Reports.module.css';

export const SAMPLE_COUNT = 5;
export const SAMPLE_MIN_MS = 60_000;

/** Five random answered recordings (≥ 60 s) per selected agent; the backend draws the sample. */
export function AudioSamplePanel({
  agents,
  range,
  sample,
  onSample,
}: {
  agents: readonly Agent[];
  range: DateRange;
  sample: AudioSample | null;
  onSample: (s: AudioSample) => void;
}) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const draw = useAudioSample();
  const name = (id: string) => agents.find((a) => a.id === id)?.displayName ?? id;

  async function run() {
    try {
      onSample(
        await draw.mutate({
          agentIds: agents.map((a) => a.id),
          range,
          count: SAMPLE_COUNT,
          minDurationMs: SAMPLE_MIN_MS,
        }),
      );
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }

  return (
    <Card
      title={t('reports.audio.title')}
      caption={t('reports.audio.caption', { n: SAMPLE_COUNT, s: SAMPLE_MIN_MS / 1000 })}
      actions={
        <Button
          icon="refresh"
          loading={draw.isPending}
          disabled={agents.length === 0}
          onClick={run}
        >
          {sample ? t('reports.audio.redraw') : t('reports.audio.draw')}
        </Button>
      }
    >
      {!sample ? (
        <p className={styles.muted}>{t('reports.audio.empty')}</p>
      ) : (
        <div className={styles.stack} data-testid="audio-sample">
          <p className={styles.muted}>
            {t('reports.audio.seed', { seed: sample.seed })}{' '}
            {sample.simulated && <Badge tone="mock">{t('common.simulated')}</Badge>}
          </p>
          {sample.agents.map((a) => (
            <div key={a.agentId}>
              <strong>{name(a.agentId)}</strong>
              {a.calls.length < a.requested && (
                <Notice
                  tone="warning"
                  title={t('reports.audio.shortage', {
                    got: a.calls.length,
                    n: a.requested,
                    eligible: a.eligible,
                  })}
                />
              )}
              <ul className={styles.list}>
                {a.calls.map((c) => (
                  <li key={c.id}>
                    <Link to={`/calls/${encodeURIComponent(c.id)}`}>
                      <bdi>{c.id}</bdi>
                    </Link>{' '}
                    · <bdi>{fmt.dateTime(c.recordedAt)}</bdi> ·{' '}
                    <bdi>{formatDuration(c.durationMs ?? 0)}</bdi>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
