import type { Branding, BrandTokens } from '@/shared/types/domain';
import { nullable, object, str, type Decoded } from '../decode';
import { localizedText } from './common';

const wireTokens = object({
  primary: nullable(str),
  primary_hover: nullable(str),
  primary_soft: nullable(str),
  primary_text: nullable(str),
});

export const wireBranding = object({
  product_name: nullable(localizedText),
  organization_name: nullable(localizedText),
  logo_light_url: nullable(str),
  logo_dark_url: nullable(str),
  tokens: object({ light: nullable(wireTokens), dark: nullable(wireTokens) }),
});

function tokensFromWire(w: Decoded<typeof wireTokens> | null): BrandTokens {
  if (!w) return {};
  return {
    primary: w.primary ?? undefined,
    primaryHover: w.primary_hover ?? undefined,
    primarySoft: w.primary_soft ?? undefined,
    primaryText: w.primary_text ?? undefined,
  };
}

export function brandingFromWire(w: Decoded<typeof wireBranding>): Branding {
  return {
    productName: w.product_name,
    organizationName: w.organization_name,
    logoLightUrl: w.logo_light_url,
    logoDarkUrl: w.logo_dark_url,
    tokens: { light: tokensFromWire(w.tokens.light), dark: tokensFromWire(w.tokens.dark) },
  };
}
