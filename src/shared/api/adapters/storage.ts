import type {
  RecoverableType,
  RecoveryItem,
  StorageOverview,
  StorageSettings,
  StorageSettingsInput,
} from '@/shared/types/domain';
import { endpoints } from '../endpoints';
import { listOf, type Send } from '../send';
import {
  overviewFromWire,
  recoveryItemFromWire,
  storageSettingsFromWire,
  storageSettingsToWire,
  wireOverview,
  wireRecoveryItem,
  wireStorageSettings,
} from '../wire/storage';

/**
 * Storage, retention and the recovery area (PROVISIONAL routes). Deleting means moving to
 * recovery (restorable); the backend never deletes permanently on its own.
 */
export interface StorageApi {
  overview(): Promise<StorageOverview>;
  settings(): Promise<StorageSettings>;
  saveSettings(input: StorageSettingsInput, confirm: boolean): Promise<StorageSettings>;
  recovery(): Promise<RecoveryItem[]>;
  moveToRecovery(itemType: RecoverableType, itemId: string, reason: string): Promise<RecoveryItem>;
  restore(id: string): Promise<RecoveryItem>;
}

export function createStorageApi(send: Send): StorageApi {
  const items = listOf(wireRecoveryItem, recoveryItemFromWire);
  return {
    overview: () =>
      send({ method: 'GET', path: endpoints.storageOverview }, wireOverview, overviewFromWire),
    settings: () =>
      send(
        { method: 'GET', path: endpoints.storageSettings },
        wireStorageSettings,
        storageSettingsFromWire,
      ),
    saveSettings: (input, confirm) =>
      send(
        {
          method: 'PUT',
          path: endpoints.storageSettings,
          body: storageSettingsToWire(input, confirm),
        },
        wireStorageSettings,
        storageSettingsFromWire,
      ),
    recovery: () =>
      send({ method: 'GET', path: endpoints.storageRecovery }, items.decoder, items.map),
    moveToRecovery: (itemType, itemId, reason) =>
      send(
        {
          method: 'POST',
          path: endpoints.storageRecovery,
          body: {
            item_type: itemType,
            item_id: itemId.trim(),
            reason: reason.trim(),
            confirm: true,
          },
        },
        wireRecoveryItem,
        recoveryItemFromWire,
      ),
    restore: (id) =>
      send(
        { method: 'POST', path: endpoints.storageRestore(id), body: { confirm: true } },
        wireRecoveryItem,
        recoveryItemFromWire,
      ),
  };
}
