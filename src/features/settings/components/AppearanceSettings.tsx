import { useI18n } from '@/shared/i18n/I18nProvider';
import { useTheme, type ThemePreference } from '@/shared/theme/ThemeProvider';
import type { Language } from '@/shared/types/domain';
import { Card } from '@/shared/ui/Card';
import styles from './Settings.module.css';

const THEMES: ThemePreference[] = ['light', 'dark', 'system'];
const LANGS: Language[] = ['ar', 'en'];

/** Per-user display preferences, stored in this browser. */
export function AppearanceSettings() {
  const { t, lang, setLang } = useI18n();
  const { preference, setPreference } = useTheme();
  return (
    <Card title={t('settings.appearance.title')} caption={t('settings.appearance.caption')}>
      <div className={styles.stack}>
        <fieldset className={styles.options}>
          <legend>{t('settings.language.label')}</legend>
          {LANGS.map((l) => (
            <label key={l} className={styles.option} lang={l}>
              <input
                type="radio"
                name="language"
                value={l}
                checked={lang === l}
                onChange={() => setLang(l)}
              />
              {t(`settings.language.${l}`)}
            </label>
          ))}
        </fieldset>
        <fieldset className={styles.options}>
          <legend>{t('settings.theme.label')}</legend>
          {THEMES.map((th) => (
            <label key={th} className={styles.option}>
              <input
                type="radio"
                name="theme"
                value={th}
                checked={preference === th}
                onChange={() => setPreference(th)}
              />
              {t(`settings.theme.${th}`)}
            </label>
          ))}
        </fieldset>
      </div>
    </Card>
  );
}
