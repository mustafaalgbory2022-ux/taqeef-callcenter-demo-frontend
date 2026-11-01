import type { Branding, LocalizedText } from '@/shared/types/domain';

/**
 * Neutral defaults used until the backend supplies approved Taqeef branding.
 * The placeholder mark is deliberately generic — official logos are never redrawn here.
 */
export const defaultBranding: Required<{
  productName: LocalizedText;
  organizationName: LocalizedText;
  logoLightUrl: string;
  logoDarkUrl: string;
}> = {
  productName: { en: 'Call Center AI', ar: 'مركز الاتصال الذكي' },
  organizationName: { en: 'Taqeef', ar: 'تقييف' },
  logoLightUrl: '/brand/logo-placeholder.svg',
  logoDarkUrl: '/brand/logo-placeholder.svg',
};

export const emptyBranding: Branding = {
  productName: null,
  organizationName: null,
  logoLightUrl: null,
  logoDarkUrl: null,
  tokens: { light: {}, dark: {} },
};
