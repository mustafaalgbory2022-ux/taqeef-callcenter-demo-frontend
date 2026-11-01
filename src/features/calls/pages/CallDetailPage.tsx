import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useAgents } from '@/features/agents';
import { EvaluationHistoryPanel, EvaluationPanel } from '@/features/evaluations';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Badge, SyntheticBadge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import type { Call } from '@/shared/types/domain';
import { AudioPlayer } from '../components/AudioPlayer';
import { CallStatusBadge } from '../components/CallStatusBadge';
import { ProcessingStatus } from '../components/ProcessingStatus';
import { TranscriptView } from '../components/TranscriptView';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useCall, useTranscript } from '../hooks/useCallData';
import styles from './CallDetail.module.css';

export function CallDetailPage() {
  const { callId = '' } = useParams();
  const call = useCall(callId);

  return <QueryView query={call}>{(data) => <CallDetail call={data} />}</QueryView>;
}

function CallDetail({ call }: { call: Call }) {
  const { t } = useI18n();
  useDocumentTitle(`${call.id} · ${call.title}`, t('app.title'));
  const [params] = useSearchParams();
  const agents = useAgents();
  const agent =
    agents.status === 'success' ? agents.data.find((a) => a.id === call.agentId) : undefined;
  const hasTranscript = call.status === 'scoring' || call.status === 'scored';
  const transcript = useTranscript(call.id, hasTranscript);
  const player = useAudioPlayer(call.audioUrl, call.durationMs);
  const [highlight, setHighlight] = useState<ReadonlySet<string>>(new Set());

  // Deep link: /calls/:id?t=<ms> starts at an evidence timestamp.
  const initialMs = Number(params.get('t'));
  const { seek } = player;
  useEffect(() => {
    if (initialMs > 0) seek(initialMs);
  }, [initialMs, seek]);

  const onEvidence = useCallback(
    (startMs: number, segmentIds: readonly string[]) => {
      setHighlight(new Set(segmentIds));
      seek(startMs, true);
    },
    [seek],
  );

  return (
    <>
      <PageHeader
        eyebrow={
          <span className={styles.meta}>
            <Link to="/calls">{t('calls.page.title')}</Link>
            <bdi>/ {call.id}</bdi>
          </span>
        }
        title={call.title}
        description={
          <span className={styles.meta}>
            {agent && (
              <>
                {t('agents.fields.name')}:{' '}
                <Link to={`/agents/${encodeURIComponent(agent.id)}`}>{agent.displayName}</Link>{' '}
                <bdi>({agent.extension})</bdi>
              </>
            )}
            <CallStatusBadge status={call.status} />
            {call.synthetic && <SyntheticBadge />}
            {call.simulated && <Badge tone="mock">{t('common.simulated')}</Badge>}
          </span>
        }
      />
      {call.status !== 'scored' && (
        <ProcessingStatus status={call.status} simulated={call.simulated} />
      )}
      <div className={styles.layout}>
        <div className={styles.column}>
          <Card title={t('calls.player.title')} flush>
            <AudioPlayer src={call.audioUrl} player={player} simulated={call.simulated} />
          </Card>
          <Card title={t('calls.transcript.title')} caption={t('calls.transcript.caption')} flush>
            {hasTranscript ? (
              <QueryView query={transcript}>
                {(data) => (
                  <TranscriptView
                    segments={data.segments}
                    currentMs={player.currentMs}
                    highlightIds={highlight}
                    onSeek={(ms) => seek(ms, true)}
                  />
                )}
              </QueryView>
            ) : (
              <p className={styles.pending}>{t('calls.transcript.pending')}</p>
            )}
          </Card>
        </div>
        <div className={styles.column}>
          {call.status === 'scored' && (
            <EvaluationPanel
              callId={call.id}
              canRescore={call.status === 'scored'}
              onEvidence={onEvidence}
            />
          )}
        </div>
      </div>
      {call.status === 'scored' && <EvaluationHistoryPanel callId={call.id} />}
    </>
  );
}
