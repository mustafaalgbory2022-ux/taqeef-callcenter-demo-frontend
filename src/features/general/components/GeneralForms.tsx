import { useState, type FormEvent } from 'react';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type {
  AppSettings,
  AppSettingsInput,
  BrandingSettings,
  BrandingSettingsInput,
  Language,
  ThemePreference,
} from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { useToast } from '@/shared/ui/Toaster';
import { TIMEZONES } from '@/shared/utils/brandingRules';
import { contrastRatio, isHexColor, MIN_CONTRAST, ON_PRIMARY } from '@/shared/utils/color';
import { useSaveApp, useSaveBranding } from '../hooks/useGeneral';
import {
  APP_SERVER_FIELD,
  BRANDING_SERVER_FIELD,
  nameOrNull,
  toAppInput,
  toBrandingInput,
  validateApp,
  validateBranding,
  type AppField,
} from '../model/general';
import styles from './General.module.css';

function VersionsTable<
  T extends { version: number; updatedAt: string; updatedBy: string; changeNote: string },
>({ label, versions, onLoad }: { label: string; versions: readonly T[]; onLoad: (v: T) => void }) {
  const { t, fmt } = useI18n();
  return (
    <TableRegion label={label}>
      <thead>
        <tr>
          <th scope="col">{t('aiAdmin.versions.version')}</th>
          <th scope="col">{t('aiAdmin.versions.note')}</th>
          <th scope="col">{t('aiAdmin.versions.at')}</th>
          <th scope="col">
            <span className="visually-hidden">{t('common.actions')}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {versions.map((v, i) => (
          <tr key={v.version}>
            <td>
              <bdi>v{v.version}</bdi>{' '}
              {i === 0 && <Badge tone="accent">{t('aiAdmin.versions.current')}</Badge>}
            </td>
            <td className={tableStyles.wrap}>{v.changeNote}</td>
            <td className={tableStyles.muted}>
              {v.updatedBy} · <bdi>{fmt.dateTime(v.updatedAt)}</bdi>
            </td>
            <td>
              {i > 0 && (
                <Button variant="ghost" size="sm" icon="history" onClick={() => onLoad(v)}>
                  {t('general.versions.load')}
                  <span className="visually-hidden"> — v{v.version}</span>
                </Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </TableRegion>
  );
}

export function AppSettingsForm({
  settings,
  versions,
}: {
  settings: AppSettings;
  versions: readonly AppSettings[];
}) {
  const { t } = useI18n();
  const toast = useToast();
  const canManage = usePermission('branding.manage');
  const save = useSaveApp();
  const [v, setV] = useState<AppSettingsInput>(() => toAppInput(settings));
  const [errors, setErrors] = useState<Partial<Record<AppField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const client = validateApp(v);
    setErrors(Object.fromEntries(Object.entries(client).map(([k, key]) => [k, t(key)])));
    if (Object.keys(client).length) return;
    try {
      const saved = await save.mutate(v);
      toast('success', t('general.app.saved', { v: saved.version }));
    } catch (err) {
      const mapped = mapFieldIssues(err, APP_SERVER_FIELD);
      if (mapped) setErrors(mapped.fields);
      if (!mapped || mapped.unmapped.length > 0)
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
    }
  }

  return (
    <Card
      title={t('general.app.title')}
      caption={t('general.app.caption', { v: settings.version })}
    >
      <form
        onSubmit={submit}
        noValidate
        className={layout.form}
        aria-label={t('general.app.title')}
      >
        <fieldset disabled={!canManage} className={`${layout.form} ${layout.bare}`}>
          <div className={layout.row}>
            <Field label={t('general.app.language')} hint={t('general.app.defaultsHint')}>
              {(p) => (
                <select
                  {...p}
                  value={v.defaultLanguage}
                  onChange={(e) =>
                    setV((x) => ({ ...x, defaultLanguage: e.target.value as Language }))
                  }
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              )}
            </Field>
            <Field label={t('general.app.theme')}>
              {(p) => (
                <select
                  {...p}
                  value={v.defaultTheme}
                  onChange={(e) =>
                    setV((x) => ({ ...x, defaultTheme: e.target.value as ThemePreference }))
                  }
                >
                  <option value="system">{t('general.app.themes.system')}</option>
                  <option value="light">{t('general.app.themes.light')}</option>
                  <option value="dark">{t('general.app.themes.dark')}</option>
                </select>
              )}
            </Field>
            <Field label={t('general.app.timezone')} error={errors.timezone}>
              {(p) => (
                <select
                  {...p}
                  value={v.timezone}
                  onChange={(e) => setV((x) => ({ ...x, timezone: e.target.value }))}
                >
                  {TIMEZONES.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field
              label={t('general.app.support')}
              hint={t('general.app.supportHint')}
              error={errors.supportContact}
            >
              {(p) => (
                <input
                  {...p}
                  type="email"
                  dir="ltr"
                  value={v.supportContact}
                  onChange={(e) => setV((x) => ({ ...x, supportContact: e.target.value }))}
                />
              )}
            </Field>
          </div>
          <p className={layout.muted}>
            <Badge icon="lock">{t('aiAdmin.locked.badge')}</Badge> {t('general.app.weekStart')}
          </p>
          <div className={layout.row}>
            <Field label={t('general.app.noticeEn')} error={errors.loginNotice}>
              {(p) => (
                <textarea
                  {...p}
                  rows={2}
                  lang="en"
                  dir="ltr"
                  maxLength={300}
                  value={v.loginNotice.en}
                  onChange={(e) =>
                    setV((x) => ({ ...x, loginNotice: { ...x.loginNotice, en: e.target.value } }))
                  }
                />
              )}
            </Field>
            <Field label={t('general.app.noticeAr')}>
              {(p) => (
                <textarea
                  {...p}
                  rows={2}
                  lang="ar"
                  dir="rtl"
                  maxLength={300}
                  value={v.loginNotice.ar}
                  onChange={(e) =>
                    setV((x) => ({ ...x, loginNotice: { ...x.loginNotice, ar: e.target.value } }))
                  }
                />
              )}
            </Field>
          </div>
          <Field label={t('aiAdmin.form.changeNote')} required error={errors.changeNote}>
            {(p) => (
              <input
                {...p}
                maxLength={200}
                value={v.changeNote}
                onChange={(e) => setV((x) => ({ ...x, changeNote: e.target.value }))}
              />
            )}
          </Field>
        </fieldset>
        {formError && <Notice tone="danger" title={formError} />}
        {canManage && (
          <div className={layout.actions}>
            <Button variant="primary" type="submit" loading={save.isPending}>
              {t('aiAdmin.form.save', { v: settings.version + 1 })}
            </Button>
          </div>
        )}
      </form>
      <VersionsTable
        label={t('general.app.versions')}
        versions={versions}
        onLoad={(old) =>
          setV({
            ...toAppInput(old),
            changeNote: t('general.versions.restoredNote', { v: old.version }),
          })
        }
      />
    </Card>
  );
}

function ColorCheck({ value, mode }: { value: string | null; mode: 'light' | 'dark' }) {
  const { t } = useI18n();
  if (!value || !isHexColor(value)) return null;
  const ratio = contrastRatio(value, ON_PRIMARY[mode]);
  return (
    <span className={layout.muted} data-testid={`contrast-${mode}`}>
      {t('general.branding.contrast', { r: ratio })}{' '}
      <Badge tone={ratio >= MIN_CONTRAST ? 'success' : 'danger'}>
        {t(ratio >= MIN_CONTRAST ? 'general.branding.aa' : 'general.branding.fails')}
      </Badge>
    </span>
  );
}

export function BrandingForm({
  branding,
  versions,
}: {
  branding: BrandingSettings;
  versions: readonly BrandingSettings[];
}) {
  const { t, pick } = useI18n();
  const toast = useToast();
  const canManage = usePermission('branding.manage');
  const save = useSaveBranding();
  const [v, setV] = useState<BrandingSettingsInput>(() => toBrandingInput(branding));
  const [names, setNames] = useState({
    productEn: branding.productName?.en ?? '',
    productAr: branding.productName?.ar ?? '',
    orgEn: branding.organizationName?.en ?? '',
    orgAr: branding.organizationName?.ar ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BrandingSettingsInput, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const input: BrandingSettingsInput = {
    ...v,
    productName: nameOrNull(names.productEn, names.productAr),
    organizationName: nameOrNull(names.orgEn, names.orgAr),
  };
  const setText = (
    k: 'logoLightPath' | 'logoDarkPath' | 'lightPrimary' | 'darkPrimary',
    value: string,
  ) => setV((x) => ({ ...x, [k]: value.trim() ? value : null }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const client = validateBranding(input);
    setErrors(Object.fromEntries(Object.entries(client).map(([k, key]) => [k, t(key)])));
    if (Object.keys(client).length) return;
    try {
      const saved = await save.mutate(input);
      toast('success', t('general.branding.saved', { v: saved.version }));
    } catch (err) {
      const mapped = mapFieldIssues(err, BRANDING_SERVER_FIELD);
      if (mapped) setErrors(mapped.fields);
      if (!mapped || mapped.unmapped.length > 0)
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
    }
  }

  function load(old: BrandingSettings) {
    setV({
      ...toBrandingInput(old),
      changeNote: t('general.versions.restoredNote', { v: old.version }),
    });
    setNames({
      productEn: old.productName?.en ?? '',
      productAr: old.productName?.ar ?? '',
      orgEn: old.organizationName?.en ?? '',
      orgAr: old.organizationName?.ar ?? '',
    });
  }

  const nameField = (key: keyof typeof names, label: string, lang: 'en' | 'ar', error?: string) => (
    <Field label={label} error={error}>
      {(p) => (
        <input
          {...p}
          lang={lang}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          maxLength={60}
          value={names[key]}
          onChange={(e) => setNames((x) => ({ ...x, [key]: e.target.value }))}
        />
      )}
    </Field>
  );

  return (
    <Card
      title={t('general.branding.title')}
      caption={t('general.branding.caption', { v: branding.version })}
    >
      <div className={layout.stack}>
        <p data-testid="branding-status">
          <Badge tone={branding.status === 'placeholder' ? 'neutral' : 'accent'}>
            {t(`general.branding.status.${branding.status}`)}
          </Badge>{' '}
          <span className={layout.muted}>{t('general.branding.noInvented')}</span>
        </p>
        <form
          onSubmit={submit}
          noValidate
          className={layout.form}
          aria-label={t('general.branding.title')}
        >
          <fieldset disabled={!canManage} className={`${layout.form} ${layout.bare}`}>
            <div className={layout.row}>
              {nameField('orgEn', t('general.branding.orgEn'), 'en', errors.organizationName)}
              {nameField('orgAr', t('general.branding.orgAr'), 'ar')}
              {nameField('productEn', t('general.branding.productEn'), 'en', errors.productName)}
              {nameField('productAr', t('general.branding.productAr'), 'ar')}
            </div>
            <div className={layout.row}>
              {(['logoLightPath', 'logoDarkPath'] as const).map((k) => (
                <Field
                  key={k}
                  label={t(`general.branding.${k}`)}
                  hint={t('general.branding.logoHint')}
                  error={errors[k]}
                >
                  {(p) => (
                    <input
                      {...p}
                      dir="ltr"
                      spellCheck={false}
                      placeholder="/brand/…"
                      value={v[k] ?? ''}
                      onChange={(e) => setText(k, e.target.value)}
                    />
                  )}
                </Field>
              ))}
            </div>
            <div className={layout.row}>
              {(
                [
                  ['lightPrimary', 'light'],
                  ['darkPrimary', 'dark'],
                ] as const
              ).map(([k, mode]) => (
                <Field
                  key={k}
                  label={t(`general.branding.${k}`)}
                  hint={t('general.branding.colorHint')}
                  error={errors[k]}
                >
                  {(p) => (
                    <div className={styles.colorRow}>
                      <input
                        {...p}
                        dir="ltr"
                        spellCheck={false}
                        placeholder="#rrggbb"
                        value={v[k] ?? ''}
                        onChange={(e) => setText(k, e.target.value)}
                      />
                      <ColorCheck value={v[k]} mode={mode} />
                    </div>
                  )}
                </Field>
              ))}
            </div>
            <Field
              label={t('general.branding.approval')}
              hint={t('general.branding.approvalHint')}
              error={errors.approvalReference}
            >
              {(p) => (
                <input
                  {...p}
                  maxLength={80}
                  value={v.approvalReference}
                  onChange={(e) => setV((x) => ({ ...x, approvalReference: e.target.value }))}
                />
              )}
            </Field>
            <Field label={t('aiAdmin.form.changeNote')} required error={errors.changeNote}>
              {(p) => (
                <input
                  {...p}
                  maxLength={200}
                  value={v.changeNote}
                  onChange={(e) => setV((x) => ({ ...x, changeNote: e.target.value }))}
                />
              )}
            </Field>
          </fieldset>
          <div
            className={styles.preview}
            data-testid="branding-preview"
            aria-label={t('general.branding.preview')}
            role="group"
          >
            <span className={layout.muted}>{t('general.branding.preview')}</span>
            <strong>
              {input.organizationName
                ? pick(input.organizationName)
                : t('general.branding.defaultOrg')}
            </strong>
            <span>
              {input.productName ? pick(input.productName) : t('general.branding.defaultProduct')}
            </span>
            <span className={layout.muted}>
              {t('general.branding.logoPreview', {
                path: v.logoLightPath ?? '/brand/logo-placeholder.svg',
              })}
            </span>
          </div>
          {formError && <Notice tone="danger" title={formError} />}
          {canManage && (
            <div className={layout.actions}>
              <Button variant="primary" type="submit" loading={save.isPending}>
                {t('aiAdmin.form.save', { v: branding.version + 1 })}
              </Button>
            </div>
          )}
        </form>
        <VersionsTable label={t('general.branding.versions')} versions={versions} onLoad={load} />
      </div>
    </Card>
  );
}
