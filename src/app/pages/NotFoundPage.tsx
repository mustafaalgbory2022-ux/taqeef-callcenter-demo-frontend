import { useI18n } from '@/shared/i18n/I18nProvider';
import { LinkButton } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/States';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <EmptyState title={t('app.notFound')}>
      <LinkButton to="/" icon="dashboard">
        {t('nav.overview')}
      </LinkButton>
    </EmptyState>
  );
}
