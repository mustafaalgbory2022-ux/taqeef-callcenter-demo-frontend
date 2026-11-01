import { useMemo, useState } from 'react';
import { sortAgents, useAgents, useQueues } from '@/features/agents';
import { currentEvaluations, summarizeByAgent } from '@/features/dashboard/model';
import { useEvaluations } from '@/features/evaluations';
import { useScorecardVersions } from '@/features/scorecards';
import { combineQueries } from '@/shared/hooks/combineQueries';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePbxMetrics } from '@/shared/hooks/usePbxMetrics';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { AudioSample } from '@/shared/types/domain';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import { useToast } from '@/shared/ui/Toaster';
import { addDays, isValidRange, todayISO } from '@/shared/utils/dates';
import { downloadBlob } from '@/shared/utils/download';
import { buildXlsx } from '@/shared/utils/xlsx';
import { AudioSamplePanel } from '../components/AudioSamplePanel';
import { ReportForm, type ReportParams } from '../components/ReportForm';
import { ReportHistory } from '../components/ReportHistory';
import { AgentReportTable, QueueReportTable } from '../components/ReportTables';
import { useSaveReport } from '../hooks/useReports';
import { buildAgentRows, buildQueueRows, buildWorkbook, resolveRange } from '../model/report';
import styles from '../components/Reports.module.css';

/** Manual weekly/monthly/yearly management reports with Excel export and audio sampling. */
export function ReportsPage() {
  const { t, fmt } = useI18n();
  useDocumentTitle(t('reports.pageTitle'), t('app.title'));
  const toast = useToast();
  const canExport = usePermission('reports.export');
  const canManage = usePermission('reports.manage');
  const today = todayISO();
  const [params, setParams] = useState<ReportParams>({
    period: 'weekly',
    anchor: addDays(today, -7),
    custom: { from: addDays(today, -30), to: today },
    queueIds: ['q-6001', 'q-6002'],
    agentIds: [],
  });
  const [sample, setSample] = useState<AudioSample | null>(null);
  const range = resolveRange(params.period, params.anchor, params.custom);
  const valid = isValidRange(range);
  const save = useSaveReport();

  const agentsQ = useAgents();
  const query = combineQueries([
    agentsQ,
    useQueues(),
    usePbxMetrics(range, null),
    useEvaluations({ from: range.from, to: range.to }),
    useScorecardVersions(),
  ] as const);
  const agentIds = params.agentIds.length
    ? params.agentIds
    : (agentsQ.data ?? []).filter((a) => a.status === 'active').map((a) => a.id);

  const data = useMemo(() => {
    if (query.status !== 'success') return null;
    const [agents, queues, pbx, evals, versions] = query.data;
    const queueRows = buildQueueRows(pbx, queues, params.queueIds);
    const agentRows = buildAgentRows(
      summarizeByAgent(currentEvaluations(evals), agents, versions),
      pbx,
      agentIds,
    );
    return { agents, queues, pbx, queueRows, agentRows };
  }, [query.status, query.data, params.queueIds, agentIds]);

  const title = t('reports.autoTitle', {
    period: t(`reports.periods.${params.period}`),
    from: range.from,
    to: range.to,
  });

  function exportExcel() {
    if (!data) return;
    const audio = (sample?.agents ?? []).flatMap((a) =>
      a.calls.map((c) => ({
        agent: data.agents.find((x) => x.id === a.agentId)?.displayName ?? a.agentId,
        callId: c.id,
        recordedAt: c.recordedAt,
        durationS: Math.round((c.durationMs ?? 0) / 1000),
      })),
    );
    const sheets = buildWorkbook(
      {
        summary: t('reports.xlsx.summary'),
        queues: t('reports.xlsx.queues'),
        agents: t('reports.xlsx.agents'),
        audio: t('reports.xlsx.audio'),
        headers: {
          queue: [
            t('queues.filter.label'),
            t('dashboard.pbx.incoming'),
            t('dashboard.pbx.answered'),
            t('dashboard.pbx.missed'),
            t('dashboard.pbx.abandoned'),
            t('reports.xlsx.slaPct'),
            t('reports.xlsx.avgWaitS'),
            t('reports.xlsx.maxWaitS'),
          ],
          agent: [
            t('agents.fields.name'),
            t('dashboard.agents.evaluated'),
            t('evaluations.noScore'),
            t('dashboard.agents.average'),
            t('dashboard.agents.low'),
            t('dashboard.pbx.answered'),
            t('dashboard.pbx.agentMissed'),
            t('reports.xlsx.avgTalkS'),
          ],
          audio: [
            t('agents.fields.name'),
            t('calls.table.call'),
            t('calls.table.recorded'),
            t('reports.xlsx.durationS'),
          ],
        },
        meta: [
          [t('reports.title'), title],
          [t('reports.period'), `${range.from} – ${range.to}`],
          [t('reports.xlsx.generated'), new Date().toISOString()],
          [t('reports.xlsx.slaFormula'), t('dashboard.pbx.formula')],
          [
            t('reports.xlsx.dataSource'),
            data.pbx.simulated ? t('common.mockData') : t('common.liveData'),
          ],
        ],
      },
      data.queueRows,
      data.agentRows,
      audio,
    );
    downloadBlob(buildXlsx(sheets), `taqeef-report-${range.from}-${range.to}.xlsx`);
    toast('success', t('reports.exported'));
  }

  async function saveReport() {
    try {
      await save.mutate({
        title,
        period: params.period,
        range,
        queueIds: params.queueIds,
        agentIds,
      });
      toast('success', t('reports.saved'));
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={t('nav.operations')}
        title={t('reports.pageTitle')}
        description={t('reports.description')}
      />
      <QueryView query={agentsQ}>
        {(agents) => (
          <Card title={t('reports.parameters')}>
            <ReportForm
              value={params}
              onChange={(v) => {
                setParams(v);
                setSample(null);
              }}
              queues={data?.queues ?? []}
              agents={sortAgents(agents.filter((a) => a.status === 'active'))}
              range={range}
            />
          </Card>
        )}
      </QueryView>
      {!valid ? (
        <Notice tone="danger" title={t('reports.invalidRange')} />
      ) : (
        <QueryView query={query} rows={6}>
          {() =>
            data && (
              <div className={styles.stack}>
                <div className={styles.actions}>
                  {canExport && (
                    <Button variant="primary" icon="arrowDown" onClick={exportExcel}>
                      {t('reports.exportExcel')}
                    </Button>
                  )}
                  {canManage && (
                    <Button icon="plus" loading={save.isPending} onClick={saveReport}>
                      {t('reports.save')}
                    </Button>
                  )}
                  <span className={styles.muted}>
                    <bdi>
                      {fmt.date(range.from)} – {fmt.date(range.to)}
                    </bdi>
                  </span>
                </div>
                {data.pbx.simulated && <Notice tone="mock">{t('reports.simulatedNote')}</Notice>}
                <QueueReportTable rows={data.queueRows} />
                <AgentReportTable rows={data.agentRows} />
                <AudioSamplePanel
                  agents={data.agents.filter((a) => agentIds.includes(a.id))}
                  range={range}
                  sample={sample}
                  onSample={setSample}
                />
                <Card title={t('reports.email.title')} caption={t('reports.email.caption')}>
                  <ul className={styles.list}>
                    <li>{t('reports.email.partQueue', { n: data.queueRows.length })}</li>
                    <li>{t('reports.email.partAgent', { n: data.agentRows.length })}</li>
                    <li>
                      {t('reports.email.partAudio', {
                        n: sample ? sample.agents.reduce((s, a) => s + a.calls.length, 0) : 0,
                      })}
                    </li>
                  </ul>
                  <p className={styles.muted}>{t('reports.email.howTo')}</p>
                </Card>
              </div>
            )
          }
        </QueryView>
      )}
      <ReportHistory />
    </>
  );
}
