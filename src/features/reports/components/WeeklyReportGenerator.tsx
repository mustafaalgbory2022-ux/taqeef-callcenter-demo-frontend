import { useState } from 'react';
import { Link } from 'react-router';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Agent, DateRange, Queue, ReportRun, ReportSettings } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Checkbox, Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { todayISO } from '@/shared/utils/dates';
import { MAX_REPORT_DAYS } from '@/shared/utils/reportRules';
import { useGenerateReport } from '../hooks/useReports';
import { defaultRunAgents, recentWeeks, validateRun } from '../model/reportSettings';

const toggle = (list: readonly string[], id: string, on: boolean) =>
  on ? [...list, id] : list.filter((x) => x !== id);

/** Manual weekly (or custom-range) report generation with the configured random sample. */
export function WeeklyReportGenerator({
  settings,
  agents,
  queues,
}: {
  settings: ReportSettings;
  agents: readonly Agent[];
  queues: readonly Queue[];
}) {
  const { t, pick, fmt } = useI18n();
  const toast = useToast();
  const canManage = usePermission('reports.manage');
  const generate = useGenerateReport();
  const today = todayISO();
  const weeks = recentWeeks(today);
  const [period, setPeriod] = useState<'weekly' | 'custom'>('weekly');
  const [week, setWeek] = useState(weeks[0]?.from ?? today);
  const [custom, setCustom] = useState<DateRange>(weeks[0] ?? { from: today, to: today });
  const [agentIds, setAgentIds] = useState<string[]>(() => defaultRunAgents(settings, agents));
  const [queueIds, setQueueIds] = useState<string[]>(() => [...settings.defaultQueueIds]);
  const [deliver, setDeliver] = useState(settings.delivery === 'email_on_generate');
  const [run, setRun] = useState<ReportRun | null>(null);
  const range = period === 'weekly' ? (weeks.find((w) => w.from === week) ?? custom) : custom;
  const request = { period, range, agentIds, queueIds, deliver };
  const error = validateRun(request, today);
  const name = (id: string) => agents.find((a) => a.id === id)?.displayName ?? id;

  async function submit() {
    try {
      const result = await generate.mutate(request);
      setRun(result);
      toast('success', t('reportSettings.run.done', { title: result.report.title }));
    } catch (err) {
      toast('error', describeError(err, t));
    }
  }

  return (
    <Card
      title={t('reportSettings.run.title')}
      caption={t('reportSettings.run.caption', {
        n: settings.callsPerAgent,
        s: settings.minDurationSeconds,
      })}
    >
      <div className={layout.form}>
        <fieldset disabled={!canManage} className={`${layout.form} ${layout.bare}`}>
          <div className={layout.row}>
            <Field label={t('reports.period')}>
              {(p) => (
                <select
                  {...p}
                  value={period}
                  onChange={(e) => setPeriod(e.target.value === 'custom' ? 'custom' : 'weekly')}
                >
                  <option value="weekly">{t('reports.periods.weekly')}</option>
                  <option value="custom">{t('reports.periods.custom')}</option>
                </select>
              )}
            </Field>
            {period === 'weekly' ? (
              <Field label={t('reportSettings.run.week')} hint={t('reportSettings.run.weekHint')}>
                {(p) => (
                  <select {...p} value={week} onChange={(e) => setWeek(e.target.value)}>
                    {weeks.map((w) => (
                      <option key={w.from} value={w.from}>
                        {fmt.date(w.from)} – {fmt.date(w.to)}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            ) : (
              <>
                <Field label={t('dateRange.from')}>
                  {(p) => (
                    <input
                      {...p}
                      type="date"
                      max={today}
                      value={custom.from}
                      onChange={(e) => setCustom((r) => ({ ...r, from: e.target.value }))}
                    />
                  )}
                </Field>
                <Field label={t('dateRange.to')}>
                  {(p) => (
                    <input
                      {...p}
                      type="date"
                      max={today}
                      value={custom.to}
                      onChange={(e) => setCustom((r) => ({ ...r, to: e.target.value }))}
                    />
                  )}
                </Field>
              </>
            )}
          </div>
          <div className={layout.row}>
            <fieldset className={layout.checks}>
              <legend>{t('reportSettings.run.agents')}</legend>
              {agents
                .filter((a) => a.status === 'active')
                .map((a) => (
                  <Checkbox
                    key={a.id}
                    checked={agentIds.includes(a.id)}
                    onChange={(on) => setAgentIds((l) => toggle(l, a.id, on))}
                  >
                    {a.displayName}
                  </Checkbox>
                ))}
            </fieldset>
            <fieldset className={layout.checks}>
              <legend>{t('reportSettings.form.queues')}</legend>
              {queues
                .filter((q) => q.status !== 'disabled')
                .map((q) => (
                  <Checkbox
                    key={q.id}
                    checked={queueIds.includes(q.id)}
                    onChange={(on) => setQueueIds((l) => toggle(l, q.id, on))}
                  >
                    <bdi>{q.number}</bdi> · {pick(q.name)}
                  </Checkbox>
                ))}
            </fieldset>
          </div>
          <Checkbox checked={deliver} onChange={setDeliver}>
            {t('reportSettings.run.deliver')}
          </Checkbox>
        </fieldset>
        {error && (
          <p className={layout.muted} role="status">
            {t(`reportSettings.run.errors.${error}`, { max: MAX_REPORT_DAYS })}
          </p>
        )}
        {canManage && (
          <div className={layout.actions}>
            <Button
              variant="primary"
              icon="play"
              loading={generate.isPending}
              disabled={error !== null}
              onClick={submit}
            >
              {t('reportSettings.run.generate')}
            </Button>
            <span className={layout.muted}>
              <bdi>
                {fmt.date(range.from)} – {fmt.date(range.to)}
              </bdi>
            </span>
          </div>
        )}
        {run && (
          <div className={layout.stack} data-testid="report-run">
            <p>
              <strong>{run.report.title}</strong>{' '}
              {run.report.simulated && <Badge tone="mock">{t('common.simulated')}</Badge>}{' '}
              <Link to="/reports">{t('reportSettings.run.openReports')}</Link>
            </p>
            <p className={layout.muted}>
              {t('reports.audio.seed', { seed: run.sample.seed })} ·{' '}
              {t('reportSettings.run.settingsVersion', { v: run.settingsVersion })}
            </p>
            <ul className={layout.list}>
              {run.sample.agents.map((a) => (
                <li key={a.agentId}>
                  {name(a.agentId)}: <bdi>{a.calls.length}</bdi> / <bdi>{a.requested}</bdi>
                  {a.calls.length < a.requested && (
                    <>
                      {' '}
                      —{' '}
                      {t('reports.audio.shortage', {
                        got: a.calls.length,
                        n: a.requested,
                        eligible: a.eligible,
                      })}
                    </>
                  )}
                </li>
              ))}
            </ul>
            {run.delivery ? (
              <Notice tone="mock" title={t('reportSettings.run.delivered')}>
                {run.delivery.detail}
              </Notice>
            ) : (
              <p className={layout.muted}>{t('reportSettings.run.notDelivered')}</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
