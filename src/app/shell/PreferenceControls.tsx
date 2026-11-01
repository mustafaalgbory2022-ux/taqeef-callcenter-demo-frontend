import { useI18n } from '@/shared/i18n/I18nProvider';
import { useTheme, type ThemePreference } from '@/shared/theme/ThemeProvider';
import styles from './PreferenceControls.module.css';

/** Quick language and theme switches (also available in Settings). */
export function PreferenceControls({ compact = false }: { compact?: boolean }) {
  const { t, lang, setLang } = useI18n();
  const { preference, setPreference } = useTheme();
  return (
    <div className={styles.controls}>
      <div className={styles.segmented} role="group" aria-label={t('settings.language.label')}>
        <button
          type="button"
          className={styles.segment}
          lang="ar"
          aria-pressed={lang === 'ar'}
          onClick={() => setLang('ar')}
        >
          العربية
        </button>
        <button
          type="button"
          className={styles.segment}
          lang="en"
          aria-pressed={lang === 'en'}
          onClick={() => setLang('en')}
        >
          English
        </button>
      </div>
      <label className={styles.theme}>
        <span className={compact ? 'visually-hidden' : undefined}>{t('settings.theme.label')}</span>
        <select
          value={preference}
          onChange={(e) => setPreference(e.target.value as ThemePreference)}
        >
          {(['light', 'dark', 'system'] as const).map((v) => (
            <option key={v} value={v}>
              {t(`settings.theme.${v}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
