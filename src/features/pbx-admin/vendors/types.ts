import type { MessageKey } from '@/shared/i18n/translate';
import type { PbxSettings, PbxSettingValue } from '@/shared/types/domain';

export interface VendorField {
  key: string;
  label: MessageKey;
  hint?: MessageKey;
  type: 'text' | 'number' | 'boolean';
  required?: boolean;
  min?: number;
  max?: number;
  /** Server (snake_case) issue field that maps to this control, when different from `key`. */
  serverField?: string;
}

/**
 * Frontend form adapter for one PBX vendor. The backend owns the real protocol adapter; this
 * describes only the settings form, defaults and client-side validation, so adding a vendor
 * means adding one module here and registering it — no page changes.
 */
export interface PbxVendorFormAdapter {
  id: string;
  fields: readonly VendorField[];
  defaults: PbxSettings;
  secretLabel: MessageKey;
  secretHint: MessageKey;
  validate(settings: PbxSettings): Partial<Record<string, MessageKey>>;
}

export const asString = (v: PbxSettingValue | undefined) => (typeof v === 'string' ? v : '');
export const asNumber = (v: PbxSettingValue | undefined) =>
  typeof v === 'number' ? v : Number.NaN;
