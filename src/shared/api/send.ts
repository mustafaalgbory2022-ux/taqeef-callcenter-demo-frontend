import { DecodeError, type Decoder } from './decode';
import { ApiError, toApiError } from './errors';
import type { ApiRequest, Transport } from './transport';

/** Send one request, decode the wire body and map it to a domain type. Throws ApiError. */
export type Send = <W, T>(req: ApiRequest, decoder: Decoder<W>, map: (w: W) => T) => Promise<T>;

export function createSend(transport: Transport): Send {
  return async (req, decoder, map) => {
    const res = await transport(req);
    if (res.status >= 400) throw toApiError(res.status, res.body);
    try {
      return map(decoder(res.body));
    } catch (err) {
      if (err instanceof DecodeError) {
        throw new ApiError(
          'contract_mismatch',
          res.status,
          `${req.method} ${req.path}: ${err.message}`,
        );
      }
      throw err;
    }
  };
}

/** Decoder + mapper pair for a list of wire items. */
export const listOf = <W, T>(decoder: Decoder<W>, map: (w: W) => T) => ({
  decoder: (v: unknown, path = '') => {
    if (!Array.isArray(v)) throw new DecodeError(path, 'array');
    return v.map((item, i) => decoder(item, `${path}[${i}]`));
  },
  map: (ws: W[]) => ws.map(map),
});
