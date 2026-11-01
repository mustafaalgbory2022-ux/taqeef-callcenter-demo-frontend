import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Badge } from '@/shared/ui/Badge';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { plannedAreas } from '../model/adminAreas';
import styles from '../components/Settings.module.css';

/** Future production administration areas — documented, intentionally not built in the demo. */
export function PlannedAreasPage() {
  const { t } = useI18n();
  useDocumentTitle(t('settings.planned.title'), t('app.title'));
  return (
    <>
      <PageHeader
        eyebrow={t('nav.administration')}
        title={t('settings.planned.title')}
        description={t('settings.planned.description')}
      />
      <Notice tone="info" title={t('settings.planned.noticeTitle')}>
        {t('settings.planned.noticeBody')}
      </Notice>
      <ul className={styles.areas}>
        {plannedAreas.map((area) => (
          <li key={area.id} className={styles.area}>
            <div className={styles.areaHead}>
              <h2 className={styles.areaTitle}>{t(area.title)}</h2>
              <Badge>{t('settings.planned.badge')}</Badge>
            </div>
            <p className={styles.areaScope}>{t(area.scope)}</p>
            <span className={styles.areaScope}>
              <bdi>{area.id}</bdi>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
