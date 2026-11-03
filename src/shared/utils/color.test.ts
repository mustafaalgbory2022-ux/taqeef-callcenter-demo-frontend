import { describe, expect, it } from 'vitest';
import { brandingIssues } from './brandingRules';
import { contrastRatio, mix } from './color';

const empty = {
  productName: null,
  organizationName: null,
  logoLightPath: null,
  logoDarkPath: null,
  lightPrimary: null,
  darkPrimary: null,
  approvalReference: '',
  changeNote: 'x',
};

describe('brand colour and asset rules', () => {
  it('computes WCAG contrast and colour mixes', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
    expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(4.5);
    expect(mix('#808080', -1)).toBe('#000000');
    expect(mix('#000000', 0.5)).toBe('#808080');
  });

  it('accepts the neutral placeholder and validates configured branding', () => {
    expect(brandingIssues(empty)).toEqual({});
    expect(
      brandingIssues({
        ...empty,
        lightPrimary: '#999999',
        darkPrimary: 'blue',
        logoLightPath: 'https://cdn.example/logo.svg',
        productName: { en: 'X', ar: '' },
      }),
    ).toEqual({
      lightPrimary: 'contrast',
      darkPrimary: 'color',
      logoLightPath: 'logoPath',
      productName: 'nameBoth',
      approvalReference: 'approval',
    });
    expect(
      brandingIssues({
        ...empty,
        lightPrimary: '#0b5d73',
        logoLightPath: '/brand/logo-light.svg',
        approvalReference: 'APPROVAL-1',
      }),
    ).toEqual({});
  });
});
