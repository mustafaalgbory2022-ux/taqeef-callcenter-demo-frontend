import { describe, expect, it } from 'vitest';
import { applyBrandTokens, safeAssetUrl, sanitizeTokens } from './applyBrandTokens';

describe('runtime brand tokens', () => {
  it('accepts only #rrggbb colours', () => {
    expect(
      sanitizeTokens({
        primary: '#112233',
        primaryHover: 'red; background:url(x)',
        primarySoft: '#abc',
      }),
    ).toEqual({ primary: '#112233' });
  });

  it('accepts only same-origin or inline-image logo URLs', () => {
    expect(safeAssetUrl('/api/branding/logo.svg')).toBe('/api/branding/logo.svg');
    expect(safeAssetUrl('data:image/svg+xml;base64,AAA')).toBe('data:image/svg+xml;base64,AAA');
    expect(safeAssetUrl('https://cdn.example.com/logo.svg')).toBeNull();
    expect(safeAssetUrl('//evil.example/logo.svg')).toBeNull();
    expect(safeAssetUrl('javascript:alert(1)')).toBeNull();
    expect(safeAssetUrl('/\\evil.example/logo.png')).toBeNull();
    expect(safeAssetUrl('/%5Cevil.example/logo.png')).toBeNull();
    expect(safeAssetUrl('/\t/evil.example/logo.png')).toBeNull();
    expect(safeAssetUrl('/brand/logo-light.svg')).toBe('/brand/logo-light.svg');
  });

  it('sets and clears CSS custom properties', () => {
    const el = document.createElement('div');
    applyBrandTokens({ light: { primary: '#112233' }, dark: { primary: '#445566' } }, el);
    expect(el.style.getPropertyValue('--brand-primary')).toBe('#112233');
    expect(el.style.getPropertyValue('--brand-primary-dark')).toBe('#445566');
    applyBrandTokens({ light: {}, dark: {} }, el);
    expect(el.style.getPropertyValue('--brand-primary')).toBe('');
  });
});
