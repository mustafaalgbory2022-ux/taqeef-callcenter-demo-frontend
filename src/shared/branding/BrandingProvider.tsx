import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { LocalizedText } from '@/shared/types/domain';
import { staticBranding } from './defaults';

export interface ResolvedBranding {
  productName: LocalizedText;
  organizationName: LocalizedText;
  logoUrl: string;
  isPlaceholder: boolean;
}

const BrandingContext = createContext<ResolvedBranding | null>(null);

/**
 * Static demo branding (contract v0.2 item 1: branding is static; there is no branding
 * route). Values come from `./defaults.ts` and the same-origin `/brand/` assets; nothing is
 * fetched at runtime.
 */
export function BrandingProvider({ children }: { children: ReactNode }) {
  const { resolved: theme } = useTheme();
  const value = useMemo<ResolvedBranding>(
    () => ({
      productName: staticBranding.productName,
      organizationName: staticBranding.organizationName,
      logoUrl: theme === 'dark' ? staticBranding.logoDarkUrl : staticBranding.logoLightUrl,
      isPlaceholder: staticBranding.isPlaceholder,
    }),
    [theme],
  );
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding(): ResolvedBranding {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used inside <BrandingProvider>');
  return ctx;
}
