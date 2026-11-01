/**
 * Replaceable brand slot. Swap `logoSrc` for the approved Taqeef asset (SVG preferred)
 * and set colours in src/styles/brand.css. No company branding is invented here.
 */
export const brandConfig = {
  productName: { en: 'Call Center AI', ar: 'مركز الاتصال الذكي' },
  organizationName: { en: 'Taqeef', ar: 'تقييف' },
  logoSrc: '/brand/logo-placeholder.svg',
  logoAlt: { en: 'Organization logo (placeholder)', ar: 'شعار المؤسسة (مؤقت)' },
  isPlaceholder: true,
} as const;
