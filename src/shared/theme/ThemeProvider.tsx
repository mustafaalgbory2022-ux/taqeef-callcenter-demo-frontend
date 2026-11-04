import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'taqeef.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** The user's own saved choice, or null when they have never chosen a theme. */
function loadStored(): ThemePreference | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* storage unavailable */
  }
  return null;
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';
}

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  /** The user's explicit choice; persisted. */
  setPreference: (p: ThemePreference) => void;
  /** Organization default (application settings); applied only without a personal choice. */
  applyDefault: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [personal, setPersonal] = useState<ThemePreference | null>(loadStored);
  const [orgDefault, setOrgDefault] = useState<ThemePreference>('system');
  const preference = personal ?? orgDefault;
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme);

  useEffect(() => {
    const mq = window.matchMedia?.(DARK_QUERY);
    if (!mq) return;
    const onChange = () => setSystem(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved = preference === 'system' ? system : preference;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPersonal(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* non-persistent */
    }
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference, applyDefault: setOrgDefault }),
    [preference, resolved, setPreference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
