import { useI18n } from '@/shared/i18n/I18nProvider';
import { Card } from '@/shared/ui/Card';
import { Notice } from '@/shared/ui/Notice';
import styles from './Dashboard.module.css';

/**
 * PBX call-handling metrics are kept separate from quality scores and are never derived
 * from recordings. Until PBX metadata exists every value is "not available".
 * Future SLA % = (Total incoming − Missed) / Total incoming × 100; abandoned is separate.
 */
export function PbxPanel() {
  const { t } = useI18n();
  const items = ['incoming', 'missed', 'abandoned', 'sla'] as const;
  return (
    <Card title={t('dashboard.pbx.title')} caption={t('dashboard.pbx.caption')}>
      <div className={styles.pbx} data-testid="pbx-panel">
        <Notice tone="info" title={t('dashboard.pbx.unavailable')}>
          {t('dashboard.pbx.unavailableBody')}
        </Notice>
        <dl className={styles.pbxGrid}>
          {items.map((key) => (
            <div key={key} className={styles.pbxItem}>
              <dt>{t(`dashboard.pbx.${key}`)}</dt>
              <dd>
                <span aria-hidden="true">—</span>
                <span className="visually-hidden">{t('dashboard.pbx.notAvailable')}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className={styles.formula}>{t('dashboard.pbx.formula')}</p>
      </div>
    </Card>
  );
}
