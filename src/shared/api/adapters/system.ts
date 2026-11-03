import type { SystemError, SystemErrorQuery, SystemHealth } from '@/shared/types/domain';
import { endpoints } from '../endpoints';
import { listOf, type Send } from '../send';
import { healthFromWire, systemErrorFromWire, wireHealth, wireSystemError } from '../wire/system';

/** System health and the admin-only error log (PROVISIONAL routes). */
export interface SystemApi {
  health(): Promise<SystemHealth>;
  errors(q?: SystemErrorQuery): Promise<SystemError[]>;
  acknowledge(id: string): Promise<SystemError>;
}

export function createSystemApi(send: Send): SystemApi {
  const errors = listOf(wireSystemError, systemErrorFromWire);
  return {
    health: () => send({ method: 'GET', path: endpoints.systemHealth }, wireHealth, healthFromWire),
    errors: (q = {}) =>
      send(
        {
          method: 'GET',
          path: endpoints.systemErrors,
          query: {
            severity: q.severity,
            service: q.service,
            search: q.search?.trim() || undefined,
            include_acknowledged: q.includeAcknowledged ? 'true' : undefined,
          },
        },
        errors.decoder,
        errors.map,
      ),
    acknowledge: (id) =>
      send(
        { method: 'POST', path: endpoints.systemErrorAck(id) },
        wireSystemError,
        systemErrorFromWire,
      ),
  };
}
