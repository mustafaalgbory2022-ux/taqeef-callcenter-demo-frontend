import { useEffect, useState } from 'react';
import type { Language } from '@/api/contract';
import { apiClient } from '@/api/client';
import { AppShell } from './AppShell';
import { DesignPreview } from './design-preview/DesignPreview';
import {
  applyLanguage,
  applyTheme,
  loadLanguage,
  loadTheme,
  type ThemePreference,
} from './preferences';

export function App() {
  const [lang, setLang] = useState<Language>(loadLanguage);
  const [theme, setTheme] = useState<ThemePreference>(loadTheme);

  useEffect(() => applyLanguage(lang), [lang]);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq?.addEventListener('change', onChange);
    return () => mq?.removeEventListener('change', onChange);
  }, [theme]);

  return (
    <AppShell
      lang={lang}
      theme={theme}
      apiMode={apiClient.mode}
      onLanguageChange={setLang}
      onThemeChange={setTheme}
    >
      <DesignPreview lang={lang} />
    </AppShell>
  );
}
