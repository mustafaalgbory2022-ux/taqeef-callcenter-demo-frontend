import type {
  DateRange,
  PbxConnector,
  PbxConnectorInput,
  PbxSyncRun,
  PbxTestResult,
  PbxVendorInfo,
} from '@/shared/types/domain';
import { endpoints } from '../endpoints';
import { listOf, type Send } from '../send';
import {
  connectorFromWire,
  connectorInputToWire,
  syncFromWire,
  testFromWire,
  vendorFromWire,
  wirePbxConnector,
  wirePbxSync,
  wirePbxTest,
  wirePbxVendor,
} from '../wire/pbx';

/**
 * PBX connector administration (PROVISIONAL routes). The backend owns the vendor adapters
 * and every network connection; this adapter never contacts a PBX itself.
 */
export interface PbxAdminApi {
  listVendors(): Promise<PbxVendorInfo[]>;
  listConnectors(): Promise<PbxConnector[]>;
  updateConnector(id: string, input: PbxConnectorInput, confirm: boolean): Promise<PbxConnector>;
  testConnector(id: string): Promise<PbxTestResult>;
  setEnabled(id: string, enabled: boolean): Promise<PbxConnector>;
  listSyncs(id: string): Promise<PbxSyncRun[]>;
  startSync(id: string, range: DateRange): Promise<PbxSyncRun>;
}

export function createPbxAdminApi(send: Send): PbxAdminApi {
  const vendors = listOf(wirePbxVendor, vendorFromWire);
  const connectors = listOf(wirePbxConnector, connectorFromWire);
  const syncs = listOf(wirePbxSync, syncFromWire);
  return {
    listVendors: () =>
      send({ method: 'GET', path: endpoints.pbxVendors }, vendors.decoder, vendors.map),
    listConnectors: () =>
      send({ method: 'GET', path: endpoints.pbxConnectors }, connectors.decoder, connectors.map),
    updateConnector: (id, input, confirm) =>
      send(
        {
          method: 'PUT',
          path: endpoints.pbxConnector(id),
          body: connectorInputToWire(input, confirm),
        },
        wirePbxConnector,
        connectorFromWire,
      ),
    testConnector: (id) =>
      send({ method: 'POST', path: endpoints.pbxConnectorTest(id) }, wirePbxTest, testFromWire),
    setEnabled: (id, enabled) =>
      send(
        {
          method: 'PUT',
          path: endpoints.pbxConnectorEnabled(id),
          body: { enabled, confirm: true },
        },
        wirePbxConnector,
        connectorFromWire,
      ),
    listSyncs: (id) =>
      send({ method: 'GET', path: endpoints.pbxConnectorSyncs(id) }, syncs.decoder, syncs.map),
    startSync: (id, range) =>
      send(
        {
          method: 'POST',
          path: endpoints.pbxConnectorSyncs(id),
          body: { from: range.from, to: range.to },
        },
        wirePbxSync,
        syncFromWire,
      ),
  };
}
