import { useI18n } from '@/shared/i18n/I18nProvider';

/**
 * "Before → after" separator that points in the reading direction (U+2192 is not mirrored
 * by bidi) and is spoken as "changed to" rather than "right arrow".
 */
export function ChangeArrow() {
  const { t, dir } = useI18n();
  return (
    <>
      {' '}
      <span aria-hidden="true">{dir === 'rtl' ? '←' : '→'}</span>
      <span className="visually-hidden">{t('common.changedTo')}</span>{' '}
    </>
  );
}
