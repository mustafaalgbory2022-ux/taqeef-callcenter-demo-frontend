import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Language, LocalizedText } from '@/shared/types/domain';
import { createFormatters, type Formatters } from './format';
import { translate, type MessageKey, type MessageVars } from './translate';

const STORAGE_KEY = 'taqeef.lang';

function load(): Language {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

export interface I18nContextValue {
  lang: Language;
  dir: 'ltr' | 'rtl';
  setLang: (lang: Language) => void;
  t: (key: MessageKey, vars?: MessageVars) => string;
  /** Pick the current-language value of bilingual data. */
  pick: (text: LocalizedText) => string;
  fmt: Formatters;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(load);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* non-persistent */
    }
  }, [lang, dir]);

  const t = useCallback(
    (key: MessageKey, vars?: MessageVars) => translate(lang, key, vars),
    [lang],
  );
  const value = useMemo<I18nContextValue>(
    () => ({ lang, dir, setLang, t, pick: (text) => text[lang], fmt: createFormatters(lang) }),
    [lang, dir, t],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
