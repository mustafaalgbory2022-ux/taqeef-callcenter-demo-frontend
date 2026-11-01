import { useScorecardVersions } from '@/features/scorecards';
import { combineQueries } from '@/shared/hooks/combineQueries';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePermission } from '@/shared/hooks/usePermission';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import { AiConfigForm } from '../components/AiConfigForm';
import { AiStatusPanel } from '../components/AiStatusPanel';
import { AiVersionHistory } from '../components/AiVersionHistory';
import { JobQueuePanel } from '../components/JobQueuePanel';
import { useAiConfig, useAiModels } from '../hooks/useAiAdmin';

/** Local transcription/evaluation models, processing limits, job controls, prompts and rules. */
export function AiAdminPage() {
  const { t } = useI18n();
  useDocumentTitle(t('aiAdmin.title'), t('app.title'));
  const canManage = usePermission('ai.manage');
  const query = combineQueries([useAiModels(), useAiConfig(), useScorecardVersions()] as const);
  return (
    <>
      <PageHeader
        eyebrow={t('nav.administration')}
        title={t('aiAdmin.title')}
        description={t('aiAdmin.description')}
      />
      <Notice tone="mock" title={t('aiAdmin.syntheticTitle')}>
        {t('aiAdmin.syntheticBody')}
      </Notice>
      {!canManage && <Notice tone="info" title={t('common.readOnly')} />}
      <QueryView query={query} rows={8}>
        {([models, config, scorecards]) => (
          <div className={layout.stack}>
            <div className={layout.grid}>
              <AiStatusPanel models={models} />
            </div>
            <JobQueuePanel retryLimit={config.limits.retryLimit} />
            <AiConfigForm
              key={config.version}
              config={config}
              models={models}
              scorecards={scorecards}
            />
            <AiVersionHistory />
          </div>
        )}
      </QueryView>
    </>
  );
}
