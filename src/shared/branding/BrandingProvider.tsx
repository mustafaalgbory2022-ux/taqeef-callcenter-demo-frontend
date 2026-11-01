import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { LocalizedText } from '@/shared/types/domain';
import { applyBrandTokens, safeAssetUrl } from './applyBrandTokens';
import { defaultBranding, emptyBranding } from './defaults';

export interface ResolvedBranding {
  productName: LocalizedText;
  organizationName: LocalizedText;
  logoUrl: string;
  isPlaceholder: boolean;
}

const BrandingContext = createContext<ResolvedBranding | null>(null);

/** Loads runtime branding from the backend (after the session opens) and applies it. */
export function BrandingProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const { resolved: theme } = useTheme();
  const query = useApiQuery(['branding'], (api) => api.getBranding(), { enabled });
  const branding = query.status === 'success' ? query.data : emptyBranding;

  useEffect(() => applyBrandTokens(branding.tokens), [branding.tokens]);

  const value = useMemo<ResolvedBranding>(() => {
    const logo = safeAssetUrl(theme === 'dark' ? branding.logoDarkUrl : branding.logoLightUrl);
    return {
      productName: branding.productName ?? defaultBranding.productName,
      organizationName: branding.organizationName ?? defaultBranding.organizationName,
      logoUrl:
        logo ?? (theme === 'dark' ? defaultBranding.logoDarkUrl : defaultBranding.logoLightUrl),
      isPlaceholder: logo === null,
    };
  }, [branding, theme]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding(): ResolvedBranding {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used inside <BrandingProvider>');
  return ctx;
}
