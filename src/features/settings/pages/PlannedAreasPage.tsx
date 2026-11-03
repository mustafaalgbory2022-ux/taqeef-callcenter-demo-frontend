import { Link } from 'react-router';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Badge } from '@/shared/ui/Badge';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { adminAreas } from '../model/adminAreas';
import styles from '../components/Settings.module.css';

/** Index of every administration area and where it is managed in the GUI. */
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
        {adminAreas.map((area) => (
          <li key={area.to} className={styles.area}>
            <div className={styles.areaHead}>
              <h2 className={styles.areaTitle}>
                <Link to={area.to}>{t(area.title)}</Link>
              </h2>
              <Badge tone="success">{t('settings.planned.badge')}</Badge>
            </div>
            <span className={styles.areaScope}>
              <bdi>{area.id}</bdi>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
