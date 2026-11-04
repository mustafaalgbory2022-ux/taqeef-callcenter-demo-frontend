import { useEffect } from 'react';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { useTheme } from '@/shared/theme/ThemeProvider';

/**
 * Applies the organization's default language and theme (application settings) after the
 * session opens. A user's own saved choice always wins; failures keep the built-in defaults.
 * Shares the query key with General administration, so saving there re-applies immediately.
 */
export function OrganizationDefaults() {
  const { applyDefault: applyLang } = useI18n();
  const { applyDefault: applyTheme } = useTheme();
  const settings = useApiQuery(['general', 'app'], (api) => api.general.appSettings());
  const lang = settings.data?.defaultLanguage;
  const theme = settings.data?.defaultTheme;
  useEffect(() => {
    if (lang) applyLang(lang);
    if (theme) applyTheme(theme);
  }, [lang, theme, applyLang, applyTheme]);
  return null;
}
