import type { MessageKey } from '@/shared/i18n/translate';
import type { ChannelMap } from '@/shared/types/domain';
import { isBlank } from '@/shared/utils/validation';

/** Demo API contract 5.3 (CONFIRMED): WAV only, at most 100 MB. Probing is server-side. */
export const MAX_UPLOAD_MB = 100;
export const ACCEPTED_AUDIO = ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'];
export const ACCEPT_ATTRIBUTE = '.wav,audio/wav';
export const MAX_DISPLAY_NAME = 200;
export const CHANNEL_MAPS: readonly ChannelMap[] = ['left_agent', 'right_agent', 'none'];

const isWav = (f: File) => ACCEPTED_AUDIO.includes(f.type) || /\.wav$/i.test(f.name);

export interface UploadValues {
  file: File | null;
  title: string;
  agentId: string;
  /** '' = the server's global default channel map. */
  channelMap: ChannelMap | '';
  confirmSynthetic: boolean;
}

export type UploadField = keyof UploadValues;
export type UploadErrors = Partial<Record<UploadField, MessageKey>>;

export function validateUpload(v: UploadValues): UploadErrors {
  const errors: UploadErrors = {};
  if (!v.file) errors.file = 'calls.upload.errors.fileRequired';
  else if (!isWav(v.file)) {
    errors.file = 'calls.upload.errors.fileType';
  } else if (v.file.size > MAX_UPLOAD_MB * 1024 * 1024)
    errors.file = 'calls.upload.errors.fileSize';
  // display_name is optional (contract v0.2 item 1); the agent is required, by id only.
  if (!isBlank(v.title) && v.title.trim().length > MAX_DISPLAY_NAME)
    errors.title = 'calls.upload.errors.titleTooLong';
  if (!v.agentId) errors.agentId = 'calls.upload.errors.agentRequired';
  if (!v.confirmSynthetic) errors.confirmSynthetic = 'calls.upload.errors.confirmRequired';
  return errors;
}

export const SERVER_UPLOAD_FIELD: Record<string, UploadField> = {
  file: 'file',
  display_name: 'title',
  agent_id: 'agentId',
  channel_map: 'channelMap',
};
