import { describe, expect, it } from 'vitest';
import type { AppSettings } from '@/shared/types/domain';
import { nameOrNull, toAppInput, validateApp, validateBranding } from './general';

const app: AppSettings = {
  version: 1,
  defaultLanguage: 'ar',
  defaultTheme: 'system',
  timezone: 'Asia/Baghdad',
  supportContact: '',
  loginNotice: { en: '', ar: '' },
  weekStart: 'saturday',
  updatedAt: '',
  updatedBy: '',
  changeNote: '',
};

describe('general administration rules', () => {
  it('validates application settings', () => {
    expect(
      validateApp({
        ...toAppInput(app),
        timezone: 'Mars/Base',
        supportContact: 'nope',
        loginNotice: { en: 'Hi', ar: '' },
      }),
    ).toEqual({
      timezone: 'general.errors.timezone',
      supportContact: 'general.errors.email',
      loginNotice: 'general.errors.bothLanguages',
      changeNote: 'general.errors.changeNote',
    });
  });

  it('maps branding issues to messages and treats empty names as defaults', () => {
    expect(nameOrNull(' ', '')).toBeNull();
    expect(
      validateBranding({
        productName: null,
        organizationName: null,
        logoLightPath: '/brand/../x.svg',
        logoDarkPath: null,
        lightPrimary: null,
        darkPrimary: null,
        approvalReference: '',
        changeNote: 'ok!',
      }),
    ).toEqual({
      logoLightPath: 'general.errors.logoPath',
      approvalReference: 'general.errors.approval',
    });
  });
});
