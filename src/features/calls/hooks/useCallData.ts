import { useEffect, useRef } from 'react';
import { useApiContext } from '@/shared/api/ApiProvider';
import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import type { Call, CallUpload } from '@/shared/types/domain';

const PROCESSING_POLL_MS = 1000;

export const isProcessing = (c: Call) => c.status !== 'scored' && c.status !== 'failed';

/**
 * When the number of calls still processing drops, new results exist: refresh every
 * calls and evaluations view so lists and KPIs include them.
 */
function useRefreshWhenProcessingSettles(processingCount: number | undefined) {
  const { store } = useApiContext();
  const previous = useRef(processingCount);
  useEffect(() => {
    const before = previous.current;
    previous.current = processingCount;
    if (before !== undefined && processingCount !== undefined && processingCount < before) {
      store.invalidate('calls');
      store.invalidate('evaluations');
    }
  }, [processingCount, store]);
}

/** Polls while any listed call is still being processed. */
export function useCalls(agentId: string | null) {
  const query = useApiQuery(
    ['calls', 'list', agentId],
    (api) => api.listCalls({ agentId: agentId ?? undefined }),
    {
      refetchIntervalMs: (data) => (data?.some(isProcessing) ? PROCESSING_POLL_MS * 2 : undefined),
    },
  );
  useRefreshWhenProcessingSettles(query.data?.filter(isProcessing).length);
  return query;
}

/** Polls while the (simulated or real) backend is still processing the call. */
export function useCall(id: string) {
  const query = useApiQuery(['calls', 'detail', id], (api) => api.getCall(id), {
    refetchIntervalMs: (data) => (!data || isProcessing(data) ? PROCESSING_POLL_MS : undefined),
  });
  useRefreshWhenProcessingSettles(query.data ? Number(isProcessing(query.data)) : undefined);
  return query;
}

export const useTranscript = (callId: string, enabled: boolean) =>
  useApiQuery(['calls', 'transcript', callId], (api) => api.getTranscript(callId), { enabled });

export const useUploadCall = () =>
  useApiMutation((api, upload: CallUpload) => api.uploadCall(upload), ['calls', 'evaluations']);
