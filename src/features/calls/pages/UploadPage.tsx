import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Card } from '@/shared/ui/Card';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { UploadForm } from '../components/UploadForm';

export function UploadPage() {
  const { t } = useI18n();
  useDocumentTitle(t('calls.upload.pageTitle'), t('app.title'));
  return (
    <>
      <PageHeader
        eyebrow={t('calls.page.title')}
        title={t('calls.upload.pageTitle')}
        description={t('calls.upload.description')}
      />
      <Notice tone="mock" title={t('calls.upload.syntheticTitle')}>
        {t('calls.upload.syntheticBody')}
      </Notice>
      <Card title={t('calls.upload.formTitle')}>
        <UploadForm />
      </Card>
    </>
  );
}
