import { useState } from 'react';
import { useApiClient } from '@/shared/api/ApiProvider';
import { resetMockData } from '@/shared/api/mock/server';
import { usePermission } from '@/shared/hooks/usePermission';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Dialog } from '@/shared/ui/Dialog';
import { Notice } from '@/shared/ui/Notice';
import styles from './Settings.module.css';

/** Mock mode only: restore the seeded synthetic dataset (discarding simulated changes). */
export function DemoDataSettings() {
  const { t } = useI18n();
  const api = useApiClient();
  const allowed = usePermission('settings.manage');
  const [confirming, setConfirming] = useState(false);
  if (api.mode !== 'mock') return null;

  return (
    <Card title={t('settings.demo.title')} caption={t('settings.demo.caption')}>
      <Notice tone="mock">{t('settings.demo.body')}</Notice>
      {allowed && (
        <p className={styles.spaced}>
          <Button variant="danger" icon="refresh" onClick={() => setConfirming(true)}>
            {t('settings.demo.reset')}
          </Button>
        </p>
      )}
      <Dialog
        open={confirming}
        title={t('settings.demo.confirmTitle')}
        onClose={() => setConfirming(false)}
        footer={
          <>
            <Button onClick={() => setConfirming(false)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              onClick={() => {
                resetMockData();
                window.location.reload();
              }}
            >
              {t('settings.demo.reset')}
            </Button>
          </>
        }
      >
        <p>{t('settings.demo.confirmBody')}</p>
      </Dialog>
    </Card>
  );
}
