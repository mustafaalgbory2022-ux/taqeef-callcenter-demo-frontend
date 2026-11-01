import type { MessageKey } from '@/shared/i18n/translate';
import { isBlank } from '@/shared/utils/validation';

export const MAX_UPLOAD_MB = 25;
export const ACCEPTED_AUDIO = [
  'audio/wav',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/webm',
];
export const ACCEPT_ATTRIBUTE = '.wav,.mp3,.ogg,.webm,audio/*';

export interface UploadValues {
  file: File | null;
  title: string;
  agentId: string;
  confirmSynthetic: boolean;
}

export type UploadField = keyof UploadValues;
export type UploadErrors = Partial<Record<UploadField, MessageKey>>;

export function validateUpload(v: UploadValues): UploadErrors {
  const errors: UploadErrors = {};
  if (!v.file) errors.file = 'calls.upload.errors.fileRequired';
  else if (!ACCEPTED_AUDIO.includes(v.file.type) && !v.file.type.startsWith('audio/')) {
    errors.file = 'calls.upload.errors.fileType';
  } else if (v.file.size > MAX_UPLOAD_MB * 1024 * 1024)
    errors.file = 'calls.upload.errors.fileSize';
  if (isBlank(v.title)) errors.title = 'calls.upload.errors.titleRequired';
  else if (v.title.trim().length > 120) errors.title = 'calls.upload.errors.titleTooLong';
  if (!v.agentId) errors.agentId = 'calls.upload.errors.agentRequired';
  if (!v.confirmSynthetic) errors.confirmSynthetic = 'calls.upload.errors.confirmRequired';
  return errors;
}

export const SERVER_UPLOAD_FIELD: Record<string, UploadField> = {
  file: 'file',
  title: 'title',
  agent_id: 'agentId',
};
