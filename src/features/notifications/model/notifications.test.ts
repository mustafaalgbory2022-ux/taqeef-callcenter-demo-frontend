import { describe, expect, it } from 'vitest';
import {
  emptyRule,
  validateReportEmail,
  validateRule,
  validateSender,
  validateTemplate,
} from './notifications';

describe('notification settings rules', () => {
  it('validates the Microsoft 365 sender and requires a secret once', () => {
    const input = {
      senderAddress: 'x',
      displayName: '',
      tenantId: '1',
      clientId: '2',
      replyTo: '',
      secret: '',
    };
    expect(validateSender(input, false)).toEqual({
      senderAddress: 'notifications.errors.email',
      tenantId: 'notifications.errors.guid',
      clientId: 'notifications.errors.guid',
      secret: 'notifications.errors.secretRequired',
    });
    const guid = '00000000-0000-4000-8000-000000000000';
    expect(
      validateSender(
        { ...input, senderAddress: 'qa@example.invalid', tenantId: guid, clientId: guid },
        true,
      ),
    ).toEqual({});
  });

  it('validates rules, templates and report email options', () => {
    expect(validateRule({ ...emptyRule('t'), name: 'R', recipients: ['bad'] })).toEqual({
      recipients: 'notifications.errors.recipientInvalid',
    });
    expect(
      validateRule({
        ...emptyRule('t'),
        name: 'R',
        recipients: ['a@b.invalid'],
        thresholdMode: 'custom',
        customThreshold: 11,
      }),
    ).toEqual({
      customThreshold: 'notifications.errors.threshold',
    });
    expect(
      validateTemplate('low_quality_alert', {
        name: 'n',
        language: 'en',
        subject: 'Call {call_id}',
        body: '{agent}',
        changeNote: 'edit',
      }),
    ).toEqual({ body: 'notifications.errors.placeholderMissing' });
    expect(
      validateReportEmail({
        recipients: [],
        cc: ['x'],
        includeQueueReport: false,
        includeAgentReport: false,
        includeAudioSample: true,
        attachExcel: true,
        language: 'both',
        templateId: 'tpl',
      }),
    ).toEqual({
      recipients: 'notifications.errors.recipientsRequired',
      cc: 'notifications.errors.recipientInvalid',
      includeQueueReport: 'notifications.errors.reportParts',
    });
  });
});
