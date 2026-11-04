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

/** The user's own saved choice, or null when they have never chosen a language. */
function loadStored(): Language | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'ar' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

export interface I18nContextValue {
  lang: Language;
  dir: 'ltr' | 'rtl';
  /** The user's explicit choice; persisted. */
  setLang: (lang: Language) => void;
  /** Organization default (application settings); applied only without a personal choice. */
  applyDefault: (lang: Language) => void;
  t: (key: MessageKey, vars?: MessageVars) => string;
  /** Pick the current-language value of bilingual data. */
  pick: (text: LocalizedText) => string;
  fmt: Formatters;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [personal, setPersonal] = useState<Language | null>(loadStored);
  const [orgDefault, setOrgDefault] = useState<Language>('en');
  const lang = personal ?? orgDefault;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((next: Language) => {
    setPersonal(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* non-persistent */
    }
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: MessageVars) => translate(lang, key, vars),
    [lang],
  );
  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      dir,
      setLang,
      applyDefault: setOrgDefault,
      t,
      pick: (text) => text[lang],
      fmt: createFormatters(lang),
    }),
    [lang, dir, t, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
