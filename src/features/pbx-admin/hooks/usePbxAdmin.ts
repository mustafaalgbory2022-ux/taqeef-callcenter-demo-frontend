import { useApiMutation } from '@/shared/hooks/useApiMutation';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import type { DateRange, PbxConnectorInput } from '@/shared/types/domain';

export const usePbxVendors = () => useApiQuery(['pbx', 'vendors'], (api) => api.pbx.listVendors());
export const usePbxConnectors = () =>
  useApiQuery(['pbx', 'connectors'], (api) => api.pbx.listConnectors());
export const usePbxSyncs = (id: string) =>
  useApiQuery(['pbx', 'syncs', id], (api) => api.pbx.listSyncs(id));

export const useSaveConnector = () =>
  useApiMutation(
    (api, a: { id: string; input: PbxConnectorInput; confirm: boolean }) =>
      api.pbx.updateConnector(a.id, a.input, a.confirm),
    ['pbx'],
  );
export const useTestConnector = () =>
  useApiMutation((api, id: string) => api.pbx.testConnector(id), ['pbx']);
export const useSetIngestion = () =>
  useApiMutation(
    (api, a: { id: string; enabled: boolean }) => api.pbx.setEnabled(a.id, a.enabled),
    ['pbx'],
  );
export const useStartSync = () =>
  useApiMutation(
    (api, a: { id: string; range: DateRange }) => api.pbx.startSync(a.id, a.range),
    ['pbx'],
  );
