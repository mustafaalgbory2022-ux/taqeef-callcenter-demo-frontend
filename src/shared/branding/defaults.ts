import type { LocalizedText } from '@/shared/types/domain';

/**
 * Static demo branding, applied at build time (contract v0.2: no branding route).
 * The mark is a neutral placeholder — official logos are never redrawn or distributed here.
 * Approved assets, when authorized, replace the files under `public/brand/` and these values.
 */
export const staticBranding = {
  productName: { en: 'Call Center AI', ar: 'مركز الاتصال الذكي' } satisfies LocalizedText,
  organizationName: { en: 'Taqeef', ar: 'تقييف' } satisfies LocalizedText,
  logoLightUrl: '/brand/logo-placeholder.svg',
  logoDarkUrl: '/brand/logo-placeholder.svg',
  isPlaceholder: true,
} as const;
