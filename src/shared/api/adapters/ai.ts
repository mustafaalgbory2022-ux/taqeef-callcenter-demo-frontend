import type {
  AiConfigDraft,
  AiConfigVersion,
  AiJobQueue,
  AiModel,
  AiStatus,
} from '@/shared/types/domain';
import { endpoints } from '../endpoints';
import { listOf, type Send } from '../send';
import {
  aiConfigFromWire,
  aiDraftToWire,
  aiJobQueueFromWire,
  aiModelFromWire,
  aiStatusFromWire,
  wireAiConfig,
  wireAiJobQueue,
  wireAiModel,
  wireAiStatus,
} from '../wire/ai';

/**
 * AI administration (PROVISIONAL routes). Model inference, the job queue and prompt execution
 * run on the local backend; this adapter only reads and changes their configuration.
 */
export interface AiAdminApi {
  listModels(): Promise<AiModel[]>;
  getStatus(): Promise<AiStatus>;
  getCurrentConfig(): Promise<AiConfigVersion>;
  listConfigVersions(): Promise<AiConfigVersion[]>;
  saveConfig(draft: AiConfigDraft): Promise<AiConfigVersion>;
  getJobs(): Promise<AiJobQueue>;
  pauseJobs(): Promise<AiJobQueue>;
  resumeJobs(): Promise<AiJobQueue>;
  retryJob(id: string): Promise<AiJobQueue>;
  cancelJob(id: string): Promise<AiJobQueue>;
}

export function createAiAdminApi(send: Send): AiAdminApi {
  const models = listOf(wireAiModel, aiModelFromWire);
  const versions = listOf(wireAiConfig, aiConfigFromWire);
  const jobs = (method: 'GET' | 'POST', path: string) =>
    send({ method, path }, wireAiJobQueue, aiJobQueueFromWire);
  return {
    listModels: () => send({ method: 'GET', path: endpoints.aiModels }, models.decoder, models.map),
    getStatus: () =>
      send({ method: 'GET', path: endpoints.aiStatus }, wireAiStatus, aiStatusFromWire),
    getCurrentConfig: () =>
      send({ method: 'GET', path: endpoints.aiConfigCurrent }, wireAiConfig, aiConfigFromWire),
    listConfigVersions: () =>
      send({ method: 'GET', path: endpoints.aiConfigVersions }, versions.decoder, versions.map),
    saveConfig: (draft) =>
      send(
        { method: 'POST', path: endpoints.aiConfigVersions, body: aiDraftToWire(draft) },
        wireAiConfig,
        aiConfigFromWire,
      ),
    getJobs: () => jobs('GET', endpoints.aiJobs),
    pauseJobs: () => jobs('POST', endpoints.aiJobsPause),
    resumeJobs: () => jobs('POST', endpoints.aiJobsResume),
    retryJob: (id) => jobs('POST', endpoints.aiJobRetry(id)),
    cancelJob: (id) => jobs('POST', endpoints.aiJobCancel(id)),
  };
}
