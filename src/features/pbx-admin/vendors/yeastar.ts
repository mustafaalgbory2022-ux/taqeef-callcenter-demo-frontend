import type { MessageKey } from '@/shared/i18n/translate';
import { isHost, PORT_RANGE } from '@/shared/utils/pbxRules';
import { asNumber, asString, type PbxVendorFormAdapter } from './types';

/** Yeastar P550 settings form. Values are entered by the administrator; none are invented. */
export const yeastarP550: PbxVendorFormAdapter = {
  id: 'yeastar_p550',
  fields: [
    {
      key: 'host',
      label: 'pbxAdmin.yeastar.host',
      hint: 'pbxAdmin.yeastar.hostHint',
      type: 'text',
      required: true,
    },
    {
      key: 'port',
      label: 'pbxAdmin.yeastar.port',
      hint: 'pbxAdmin.yeastar.portHint',
      type: 'number',
      required: true,
      min: PORT_RANGE[0],
      max: PORT_RANGE[1],
    },
    {
      key: 'api_client_id',
      label: 'pbxAdmin.yeastar.clientId',
      hint: 'pbxAdmin.yeastar.clientIdHint',
      type: 'text',
      required: true,
    },
    { key: 'use_tls', label: 'pbxAdmin.yeastar.useTls', type: 'boolean' },
    { key: 'verify_certificate', label: 'pbxAdmin.yeastar.verifyCertificate', type: 'boolean' },
  ],
  defaults: { host: '', port: 443, use_tls: true, verify_certificate: true, api_client_id: '' },
  secretLabel: 'pbxAdmin.yeastar.secret',
  secretHint: 'pbxAdmin.yeastar.secretHint',
  validate(s) {
    const errors: Partial<Record<string, MessageKey>> = {};
    const host = asString(s.host).trim();
    if (!host) errors.host = 'pbxAdmin.errors.required';
    else if (!isHost(host)) errors.host = 'pbxAdmin.errors.host';
    const port = asNumber(s.port);
    if (!Number.isInteger(port) || port < PORT_RANGE[0] || port > PORT_RANGE[1])
      errors.port = 'pbxAdmin.errors.port';
    if (!/^[A-Za-z0-9._-]{4,64}$/.test(asString(s.api_client_id).trim()))
      errors.api_client_id = 'pbxAdmin.errors.clientId';
    if (s.use_tls === false && s.verify_certificate === true)
      errors.verify_certificate = 'pbxAdmin.errors.verifyWithoutTls';
    return errors;
  },
};
