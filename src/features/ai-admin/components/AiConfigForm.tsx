import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type {
  AiConfigDraft,
  AiConfigVersion,
  AiLimits,
  AiModel,
  AiModelKind,
  AiPromptKind,
  ScorecardVersion,
} from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Checkbox, Field } from '@/shared/ui/Field';
import { Icon } from '@/shared/ui/Icon';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import {
  checkPlaceholders,
  LIMIT_RANGES,
  OPTIONAL_PLACEHOLDERS,
  PROMPT_PLACEHOLDERS,
} from '@/shared/utils/aiRules';
import { useSaveAiConfig } from '../hooks/useAiAdmin';
import {
  AI_SERVER_FIELD,
  changedSettings,
  LIMIT_KEYS,
  PROMPT_KINDS,
  selectableModels,
  toAiDraft,
  validateAiConfig,
  type AiField,
} from '../model/aiConfig';

export interface AiConfigFormProps {
  config: AiConfigVersion;
  models: readonly AiModel[];
  scorecards: readonly ScorecardVersion[];
}

const numberValue = (n: number) => (Number.isNaN(n) ? '' : String(n));
const toNumber = (s: string) => (s.trim() === '' ? Number.NaN : Number(s));

/** Editable AI configuration. Saving creates a new immutable configuration version. */
export function AiConfigForm({ config, models, scorecards }: AiConfigFormProps) {
  const { t } = useI18n();
  const toast = useToast();
  const canManage = usePermission('ai.manage');
  const save = useSaveAiConfig();
  const initial = useMemo(() => toAiDraft(config), [config]);
  const [d, setD] = useState<AiConfigDraft>(initial);
  const [errors, setErrors] = useState<Partial<Record<AiField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const changed = changedSettings(initial, d);
  const latest = scorecards.reduce<ScorecardVersion | null>(
    (a, b) => (a === null || b.version > a.version ? b : a),
    null,
  );
  const bound =
    d.scorecardBinding === 'pinned'
      ? scorecards.find((s) => s.version === d.pinnedScorecardVersion)
      : latest;

  const set = <K extends keyof AiConfigDraft>(k: K, v: AiConfigDraft[K]) =>
    setD((x) => ({ ...x, [k]: v }));
  const setLimit = (k: keyof AiLimits, v: number) =>
    setD((x) => ({ ...x, limits: { ...x.limits, [k]: v } }));
  const setPrompt = (k: AiPromptKind, v: string) =>
    setD((x) => ({ ...x, prompts: { ...x.prompts, [k]: v } }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const client = validateAiConfig(
      d,
      models,
      scorecards.map((s) => s.version),
    );
    setErrors(Object.fromEntries(Object.entries(client).map(([k, key]) => [k, t(key)])));
    if (Object.keys(client).length > 0) {
      setFormError(t('errors.validation'));
      return;
    }
    try {
      const saved = await save.mutate(d);
      toast('success', t('aiAdmin.form.saved', { v: saved.version }));
    } catch (err) {
      const mapped = mapFieldIssues(err, AI_SERVER_FIELD);
      if (mapped) setErrors(mapped.fields);
      if (!mapped || mapped.unmapped.length > 0)
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
    }
  }

  const modelSelect = (kind: AiModelKind, field: 'transcriptionModelId' | 'evaluationModelId') => (
    <Field
      label={t(`aiAdmin.form.${field}`)}
      hint={t('aiAdmin.form.modelHint')}
      required
      error={errors[field]}
    >
      {(p) => (
        <select
          {...p}
          value={d[field]}
          disabled={!canManage}
          onChange={(e) => set(field, e.target.value)}
        >
          {selectableModels(models, kind).map((m) => (
            <option key={m.id} value={m.id} disabled={m.status !== 'available'}>
              {m.name} · v{m.version} · {m.sizeGb} GB
              {m.status !== 'available' ? ` (${t(`aiAdmin.models.${m.status}`)})` : ''}
            </option>
          ))}
        </select>
      )}
    </Field>
  );

  return (
    <form
      onSubmit={submit}
      noValidate
      className={layout.stack}
      aria-label={t('aiAdmin.form.label')}
    >
      <fieldset disabled={!canManage} className={`${layout.stack} ${layout.bare}`}>
        <div className={layout.grid}>
          <Card title={t('aiAdmin.form.modelsTitle')} caption={t('aiAdmin.form.modelsCaption')}>
            <div className={layout.form}>
              {modelSelect('transcription', 'transcriptionModelId')}
              {modelSelect('evaluation', 'evaluationModelId')}
              <div className={layout.row}>
                <Field label={t('aiAdmin.form.language')}>
                  {(p) => (
                    <select
                      {...p}
                      value={d.language}
                      onChange={(e) => set('language', e.target.value as AiConfigDraft['language'])}
                    >
                      {(['ar-IQ', 'ar', 'auto'] as const).map((l) => (
                        <option key={l} value={l}>
                          {t(`aiAdmin.languages.${l === 'ar-IQ' ? 'arIQ' : l}`)}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field
                  label={t('aiAdmin.form.diarization')}
                  hint={t('aiAdmin.form.diarizationHint')}
                >
                  {(p) => (
                    <select
                      {...p}
                      value={d.diarization}
                      onChange={(e) =>
                        set('diarization', e.target.value as AiConfigDraft['diarization'])
                      }
                    >
                      {(['channel', 'model', 'off'] as const).map((v) => (
                        <option key={v} value={v}>
                          {t(`aiAdmin.diarization.${v}`)}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>
              <Checkbox checked={d.applyDictionary} onChange={(v) => set('applyDictionary', v)}>
                {t('aiAdmin.form.applyDictionary')}
              </Checkbox>
            </div>
          </Card>

          <Card title={t('aiAdmin.form.limitsTitle')} caption={t('aiAdmin.form.limitsCaption')}>
            <div className={layout.row}>
              {LIMIT_KEYS.map((k) => (
                <Field
                  key={k}
                  label={t(`aiAdmin.limits.${k}`)}
                  hint={t('aiAdmin.form.range', {
                    min: LIMIT_RANGES[k][0],
                    max: LIMIT_RANGES[k][1],
                  })}
                  error={errors[`limits.${k}`]}
                >
                  {(p) => (
                    <input
                      {...p}
                      type="number"
                      inputMode="numeric"
                      min={LIMIT_RANGES[k][0]}
                      max={LIMIT_RANGES[k][1]}
                      step={1}
                      value={numberValue(d.limits[k])}
                      onChange={(e) => setLimit(k, toNumber(e.target.value))}
                    />
                  )}
                </Field>
              ))}
            </div>
          </Card>
        </div>

        <Card title={t('aiAdmin.form.rulesTitle')} caption={t('aiAdmin.form.rulesCaption')}>
          <div className={layout.stack}>
            <div className={layout.row}>
              <Field
                label={t('aiAdmin.form.temperature')}
                hint={t('aiAdmin.form.temperatureHint')}
                error={errors.temperature}
              >
                {(p) => (
                  <input
                    {...p}
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={numberValue(d.temperature)}
                    onChange={(e) => set('temperature', toNumber(e.target.value))}
                  />
                )}
              </Field>
              <Field
                label={t('aiAdmin.form.minConfidence')}
                hint={t('aiAdmin.form.range', { min: 0.5, max: 0.99 })}
                error={errors.minClassificationConfidence}
              >
                {(p) => (
                  <input
                    {...p}
                    type="number"
                    min={0.5}
                    max={0.99}
                    step={0.01}
                    value={numberValue(d.minClassificationConfidence)}
                    onChange={(e) => set('minClassificationConfidence', toNumber(e.target.value))}
                  />
                )}
              </Field>
              <Field label={t('aiAdmin.form.lowConfidenceAction')}>
                {(p) => (
                  <select
                    {...p}
                    value={d.lowConfidenceAction}
                    onChange={(e) =>
                      set(
                        'lowConfidenceAction',
                        e.target.value as AiConfigDraft['lowConfidenceAction'],
                      )
                    }
                  >
                    <option value="flag_for_review">
                      {t('aiAdmin.lowConfidence.flag_for_review')}
                    </option>
                    <option value="exclude_from_reports">
                      {t('aiAdmin.lowConfidence.exclude_from_reports')}
                    </option>
                  </select>
                )}
              </Field>
            </div>
            <Checkbox
              checked={d.requireEvidenceQuotes}
              onChange={(v) => set('requireEvidenceQuotes', v)}
            >
              {t('aiAdmin.form.requireEvidence')}
            </Checkbox>
            <div className={layout.row}>
              <Field label={t('aiAdmin.form.binding')} hint={t('aiAdmin.form.bindingHint')}>
                {(p) => (
                  <select
                    {...p}
                    value={d.scorecardBinding}
                    onChange={(e) => {
                      const pinned = e.target.value === 'pinned';
                      setD((x) => ({
                        ...x,
                        scorecardBinding: pinned ? 'pinned' : 'latest',
                        pinnedScorecardVersion: pinned
                          ? (x.pinnedScorecardVersion ?? latest?.version ?? null)
                          : null,
                      }));
                    }}
                  >
                    <option value="latest">{t('aiAdmin.binding.latest')}</option>
                    <option value="pinned">{t('aiAdmin.binding.pinned')}</option>
                  </select>
                )}
              </Field>
              {d.scorecardBinding === 'pinned' && (
                <Field
                  label={t('aiAdmin.form.pinnedVersion')}
                  error={errors.pinnedScorecardVersion}
                >
                  {(p) => (
                    <select
                      {...p}
                      value={d.pinnedScorecardVersion ?? ''}
                      onChange={(e) => set('pinnedScorecardVersion', Number(e.target.value))}
                    >
                      {scorecards.map((s) => (
                        <option key={s.version} value={s.version}>
                          v{s.version} · {s.changeNote}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              )}
            </div>
            {bound && (
              <p className={layout.muted} data-testid="bound-scorecard">
                {t('aiAdmin.form.boundScorecard', {
                  v: bound.version,
                  n: bound.criteria.length,
                  points: bound.criteria.reduce((s, c) => s + c.maxPoints, 0),
                  min: bound.minimumAssessablePoints,
                })}{' '}
                <Link to="/admin/scorecard">{t('aiAdmin.form.openScorecard')}</Link>
              </p>
            )}
            <LockedRules minPoints={bound?.minimumAssessablePoints ?? 6} />
          </div>
        </Card>

        <Card title={t('aiAdmin.form.promptsTitle')} caption={t('aiAdmin.form.promptsCaption')}>
          <div className={layout.stack}>
            {PROMPT_KINDS.map((kind) => (
              <PromptEditor
                key={kind}
                kind={kind}
                value={d.prompts[kind]}
                error={errors[`prompts.${kind}`]}
                onChange={(v) => setPrompt(kind, v)}
              />
            ))}
          </div>
        </Card>
      </fieldset>

      {canManage && (
        <Card
          title={t('aiAdmin.form.saveTitle')}
          caption={t('aiAdmin.form.saveCaption', { v: config.version + 1 })}
        >
          <div className={layout.form}>
            <p className={layout.muted} data-testid="ai-changes">
              {changed.length === 0
                ? t('aiAdmin.form.noChanges')
                : t('aiAdmin.form.changes', {
                    list: changed.map((k) => t(`aiAdmin.fieldNames.${k}`)).join(', '),
                  })}
            </p>
            <Field label={t('aiAdmin.form.changeNote')} required error={errors.changeNote}>
              {(p) => (
                <input
                  {...p}
                  value={d.changeNote}
                  maxLength={200}
                  onChange={(e) => set('changeNote', e.target.value)}
                />
              )}
            </Field>
            {formError && <Notice tone="danger" title={formError} />}
            <div className={layout.actions}>
              <Button
                variant="primary"
                type="submit"
                loading={save.isPending}
                disabled={changed.length === 0}
              >
                {t('aiAdmin.form.save', { v: config.version + 1 })}
              </Button>
              <Button
                type="button"
                disabled={changed.length === 0 && !d.changeNote}
                onClick={() => {
                  setD(initial);
                  setErrors({});
                  setFormError(null);
                }}
              >
                {t('aiAdmin.form.discard')}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </form>
  );
}

function LockedRules({ minPoints }: { minPoints: number }) {
  const { t } = useI18n();
  const rule = (children: ReactNode) => (
    <li>
      <Icon name="lock" size={12} /> {children}
    </li>
  );
  return (
    <div>
      <p className={layout.muted}>
        <Badge icon="lock">{t('aiAdmin.locked.badge')}</Badge> {t('aiAdmin.locked.caption')}
      </p>
      <ul className={layout.list}>
        {rule(t('aiAdmin.locked.penalty'))}
        {rule(t('aiAdmin.locked.mixed'))}
        {rule(t('aiAdmin.locked.minimum', { n: minPoints }))}
        {rule(t('aiAdmin.locked.noEstimate'))}
      </ul>
    </div>
  );
}

function PromptEditor({
  kind,
  value,
  error,
  onChange,
}: {
  kind: AiPromptKind;
  value: string;
  error: string | undefined;
  onChange: (v: string) => void;
}) {
  const { t } = useI18n();
  const check = checkPlaceholders(kind, value);
  const required = PROMPT_PLACEHOLDERS[kind];
  return (
    <div className={layout.stack}>
      <Field
        label={t(`aiAdmin.prompts.${kind}`)}
        hint={t('aiAdmin.prompts.hint', {
          required: required.map((p) => `{${p}}`).join(' '),
          optional: OPTIONAL_PLACEHOLDERS.map((p) => `{${p}}`).join(' '),
        })}
        required
        error={error}
      >
        {(p) => (
          <textarea
            {...p}
            className={`${p.className} ${layout.textarea}`}
            dir="auto"
            rows={6}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </Field>
      {(check.missing.length > 0 || check.unknown.length > 0) && (
        <p className={layout.muted} data-testid={`prompt-check-${kind}`}>
          {check.missing.length > 0 && (
            <>
              {t('aiAdmin.prompts.missing')}{' '}
              <bdi className={layout.mono}>{check.missing.map((x) => `{${x}}`).join(' ')}</bdi>{' '}
            </>
          )}
          {check.unknown.length > 0 && (
            <>
              {t('aiAdmin.prompts.unknown')}{' '}
              <bdi className={layout.mono}>{check.unknown.map((x) => `{${x}}`).join(' ')}</bdi>
            </>
          )}
        </p>
      )}
    </div>
  );
}
