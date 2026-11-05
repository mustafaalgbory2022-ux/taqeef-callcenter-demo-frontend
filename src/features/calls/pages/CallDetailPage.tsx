import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useAgents } from '@/features/agents';
import {
  EvaluationHistoryPanel,
  EvaluationPanel,
  type EvidenceSelection,
  type ResolvedSegment,
} from '@/features/evaluations';
import { useApiClient } from '@/shared/api/ApiProvider';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Badge, SyntheticBadge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import type { Call } from '@/shared/types/domain';
import { AudioPlayer } from '../components/AudioPlayer';
import { CallStatusBadge } from '../components/CallStatusBadge';
import { ProcessingStatus } from '../components/ProcessingStatus';
import { EvidenceStatus } from '../components/EvidenceStatus';
import { TranscriptView } from '../components/TranscriptView';
import { locateEvidence, type EvidenceLocation } from '../model/transcript';
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
  const api = useApiClient();
  useDocumentTitle(`${call.id} · ${call.title}`, t('app.title'));
  const [params] = useSearchParams();
  const agents = useAgents();
  const agent =
    agents.status === 'success' ? agents.data.find((a) => a.id === call.agentId) : undefined;
  // The call's current revision. A run's evidence is resolved only against the revision that
  // run evaluated; a mismatch is reported, never resolved against other text.
  const revisionId = call.currentTranscriptRevisionId;
  const hasTranscript = revisionId !== null;
  const transcript = useTranscript(revisionId ?? '', hasTranscript);
  const audioSrc = useMemo(() => api.audioSrc(call.id), [api, call.id]);
  const player = useAudioPlayer(audioSrc, call.durationMs);
  const [highlight, setHighlight] = useState<ReadonlySet<string>>(new Set());
  const [selection, setSelection] = useState<{
    evidence: EvidenceSelection;
    location: EvidenceLocation;
    key: number;
  } | null>(null);
  const loaded = transcript.data;

  // Deep link: /calls/:id?t=<ms> starts at an evidence timestamp.
  const initialMs = Number(params.get('t'));
  const { seek } = player;
  useEffect(() => {
    if (initialMs > 0) seek(initialMs);
  }, [initialMs, seek]);

  // Locate the selected evidence in the loaded transcript; play only when it was located.
  const onEvidence = useCallback(
    (evidence: EvidenceSelection, group: readonly string[]) => {
      const location: EvidenceLocation = loaded
        ? locateEvidence(loaded, evidence)
        : { status: 'unavailable', reason: 'segment_missing' };
      setSelection((prev) => ({ evidence, location, key: (prev?.key ?? 0) + 1 }));
      setHighlight(location.status === 'located' ? new Set(group) : new Set());
      if (location.status === 'located') seek(location.startMs, true);
    },
    [seek, loaded],
  );

  const resolveEvidence = useCallback(
    (evidence: EvidenceSelection): ResolvedSegment | null => {
      if (!loaded) return null;
      const location = locateEvidence(loaded, evidence);
      return location.status === 'located'
        ? { startMs: location.startMs, text: location.text }
        : null;
    },
    [loaded],
  );

  const showLine = useCallback((segmentId: string) => {
    document.querySelector<HTMLElement>(`[data-segment-id="${CSS.escape(segmentId)}"]`)?.focus();
  }, []);

  const clearEvidence = useCallback(() => {
    setSelection(null);
    setHighlight(new Set());
  }, []);

  const located = selection?.location.status === 'located' ? selection.location : null;

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
      {call.channelLayout === 'mixed' && (
        <Notice tone="info" title={t('calls.channel.mixedTitle')} testId="mixed-channel">
          {t('calls.channel.mixedBody')}
        </Notice>
      )}
      {call.status !== 'scored' && (
        <ProcessingStatus status={call.status} simulated={call.simulated} />
      )}
      <div className={styles.layout}>
        <div className={styles.column}>
          <Card title={t('calls.player.title')} flush>
            <AudioPlayer src={audioSrc} player={player} simulated={call.simulated} />
          </Card>
          <Card title={t('calls.transcript.title')} caption={t('calls.transcript.caption')} flush>
            {hasTranscript ? (
              <QueryView query={transcript}>
                {(data) => (
                  <>
                    <EvidenceStatus
                      selection={selection}
                      onPlay={(ms) => seek(ms, true)}
                      onShowLine={showLine}
                      onClear={clearEvidence}
                    />
                    <TranscriptView
                      segments={data.segments}
                      currentMs={player.currentMs}
                      highlightIds={highlight}
                      evidence={
                        located && selection
                          ? {
                              segmentId: located.segmentId,
                              key: selection.key,
                            }
                          : null
                      }
                      onSeek={(ms) => seek(ms, true)}
                    />
                  </>
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
              resolveEvidence={resolveEvidence}
            />
          )}
        </div>
      </div>
      {call.status === 'scored' && <EvaluationHistoryPanel callId={call.id} />}
    </>
  );
}
