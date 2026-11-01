import type { ReactNode } from 'react';
import type { Language } from '@/api/contract';
import type { ApiMode } from '@/config/env';
import { brandConfig } from '@/config/brand.config';
import { DataSourceBadge } from '@/components/ui/DataSourceBadge';
import { translate } from '@/i18n';
import type { ThemePreference } from './preferences';
import styles from './AppShell.module.css';

const NAV = [
  { key: 'dashboard', d: 'M2 2h5v5H2zM9 2h5v3H9zM9 7h5v7H9zM2 9h5v5H2z' },
  {
    key: 'calls',
    d: 'M4 2h3l1 3-2 1a7 7 0 0 0 4 4l1-2 3 1v3a1 1 0 0 1-1 1A11 11 0 0 1 3 3a1 1 0 0 1 1-1Z',
  },
  { key: 'scorecards', d: 'M3 2h10v12H3zM5.5 5h5M5.5 8h5M5.5 11h3' },
  { key: 'evaluations', d: 'M2 13h12M4 13V8M8 13V4M12 13V6' },
] as const;

export interface AppShellProps {
  lang: Language;
  theme: ThemePreference;
  apiMode: ApiMode;
  onLanguageChange: (lang: Language) => void;
  onThemeChange: (theme: ThemePreference) => void;
  children: ReactNode;
}

export function AppShell({
  lang,
  theme,
  apiMode,
  onLanguageChange,
  onThemeChange,
  children,
}: AppShellProps) {
  const t = (key: string) => translate(lang, key);
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        {t('app.skipToContent')}
      </a>

      <div className={styles.brand}>
        <img
          className={styles.logo}
          src={brandConfig.logoSrc}
          alt={brandConfig.logoAlt[lang]}
          width={28}
          height={28}
        />
        <div className={styles.brandText}>
          <span className={styles.org}>{brandConfig.organizationName[lang]}</span>
          <span className={styles.product}>{brandConfig.productName[lang]}</span>
        </div>
      </div>

      <header className={styles.header}>
        <DataSourceBadge mode={apiMode} label={t(`app.dataSource.${apiMode}`)} />
        <span className={styles.spacer} />
        <div className={styles.control} role="group" aria-label={t('app.language')}>
          <div className={styles.segmented}>
            <button
              type="button"
              className={styles.segment}
              aria-pressed={lang === 'ar'}
              lang="ar"
              onClick={() => onLanguageChange('ar')}
            >
              العربية
            </button>
            <button
              type="button"
              className={styles.segment}
              aria-pressed={lang === 'en'}
              lang="en"
              onClick={() => onLanguageChange('en')}
            >
              English
            </button>
          </div>
        </div>
        <label className={styles.control}>
          {t('app.theme.label')}
          <select
            className={styles.select}
            value={theme}
            onChange={(e) => onThemeChange(e.target.value as ThemePreference)}
          >
            {(['light', 'dark', 'system'] as const).map((v) => (
              <option key={v} value={v}>
                {t(`app.theme.${v}`)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <nav className={styles.nav} aria-label={t('app.mainNav')}>
        <ul className={styles.navList}>
          {NAV.map((item, i) => (
            <li key={item.key}>
              <button
                type="button"
                className={styles.navItem}
                aria-current={i === 0 ? 'page' : undefined}
                aria-disabled={i === 0 ? undefined : true}
                title={i === 0 ? undefined : t('app.comingSoon')}
              >
                <svg className={styles.navIcon} viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d={item.d}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
                {t(`app.nav.${item.key}`)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main id="main" className={styles.main} tabIndex={-1}>
        <div className={styles.mainInner}>{children}</div>
      </main>
    </div>
  );
}
