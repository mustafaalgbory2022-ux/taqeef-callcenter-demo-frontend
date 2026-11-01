import { combineQueries } from '@/shared/hooks/combineQueries';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePermission } from '@/shared/hooks/usePermission';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Card } from '@/shared/ui/Card';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import { ScorecardEditor } from '../components/ScorecardEditor';
import { VersionHistory } from '../components/VersionHistory';
import { useCurrentScorecard, useScorecardVersions } from '../hooks/useScorecards';
import styles from '../components/Editor.module.css';

export function ScorecardPage() {
  const { t, pick } = useI18n();
  useDocumentTitle(t('scorecards.page.title'), t('app.title'));
  const canEdit = usePermission('scorecards.manage');
  const query = combineQueries([useCurrentScorecard(), useScorecardVersions()] as const);

  return (
    <>
      <PageHeader
        eyebrow={t('nav.administration')}
        title={t('scorecards.page.title')}
        description={t('scorecards.page.description')}
      />
      <Notice tone="mock" title={t('scorecards.page.placeholderTitle')}>
        {t('scorecards.page.placeholderBody')}
      </Notice>
      <QueryView query={query} rows={8}>
        {([current, versions]) => (
          <div className={styles.editor}>
            <Card
              title={t('scorecards.editor.title', {
                name: pick(current.name),
                version: current.version,
              })}
              caption={t('scorecards.editor.caption')}
            >
              {canEdit ? (
                <ScorecardEditor key={current.version} current={current} />
              ) : (
                <Notice tone="info" title={t('common.readOnly')} />
              )}
            </Card>
            <Card
              title={t('scorecards.history.title')}
              caption={t('scorecards.history.caption')}
              flush
            >
              <VersionHistory versions={versions} />
            </Card>
          </div>
        )}
      </QueryView>
    </>
  );
}
