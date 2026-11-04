import { useState, type FormEvent } from 'react';
import { focusFirstInvalid } from '@/shared/ui/focusInvalid';
import { useUserAction, useUsers } from '@/features/users';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { useApiClient } from '@/shared/api/ApiProvider';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { AuthSession, SecurityPolicy, SecurityPolicyInput } from '@/shared/types/domain';
import { AuditTrail } from '@/shared/ui/AuditTrail';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Checkbox, Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { EmptyState, QueryView } from '@/shared/ui/States';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { useToast } from '@/shared/ui/Toaster';
import { POLICY_RANGES } from '@/shared/utils/securityRules';
import {
  useRevokeSession,
  useSavePolicy,
  useSecurityEvents,
  useSessions,
} from '../hooks/useSecurity';
import {
  POLICY_KEYS,
  POLICY_SERVER_FIELD,
  toPolicyInput,
  validatePolicy,
  type PolicyField,
} from '../model/security';

/** Makes clear that the demo launch code is not production authentication. */
export function AuthModeCard() {
  const { t } = useI18n();
  const api = useApiClient();
  return (
    <Card title={t('security.mode.title')} caption={t('security.mode.caption')}>
      <dl className={layout.facts} data-testid="auth-mode">
        <dt>{t('security.mode.current')}</dt>
        <dd>
          <Badge tone="mock">
            {t(api.mode === 'mock' ? 'security.mode.demo' : 'security.mode.production')}
          </Badge>
          <div className={layout.muted}>
            {t(api.mode === 'mock' ? 'security.mode.demoBody' : 'security.mode.productionBody')}
          </div>
        </dd>
        <dt>{t('security.mode.production')}</dt>
        <dd>{t('security.mode.productionFlow')}</dd>
        <dt>{t('security.mode.backend')}</dt>
        <dd>{t('security.mode.backendBody')}</dd>
      </dl>
    </Card>
  );
}

export function PolicyForm({ policy }: { policy: SecurityPolicy }) {
  const { t } = useI18n();
  const toast = useToast();
  const canManage = usePermission('security.manage');
  const save = useSavePolicy();
  const [v, setV] = useState<SecurityPolicyInput>(() => toPolicyInput(policy));
  const [errors, setErrors] = useState<Partial<Record<PolicyField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    e.preventDefault();
    setFormError(null);
    const client = validatePolicy(v);
    setErrors(Object.fromEntries(Object.entries(client).map(([k, key]) => [k, t(key)])));
    if (Object.keys(client).length > 0) {
      focusFirstInvalid(form);
      return;
    }
    try {
      const saved = await save.mutate(v);
      toast('success', t('security.policy.saved', { v: saved.version }));
    } catch (err) {
      const mapped = mapFieldIssues(err, POLICY_SERVER_FIELD);
      if (mapped) setErrors(mapped.fields);
      focusFirstInvalid(form);
      if (!mapped || mapped.unmapped.length > 0)
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
    }
  }

  return (
    <Card
      title={t('security.policy.title')}
      caption={t('security.policy.caption', { v: policy.version })}
    >
      <form
        onSubmit={submit}
        noValidate
        className={layout.form}
        aria-label={t('security.policy.title')}
      >
        <fieldset disabled={!canManage} className={`${layout.form} ${layout.bare}`}>
          <p>
            <Badge icon="lock">{t('aiAdmin.locked.badge')}</Badge>{' '}
            {t('security.policy.mfaMandatory')}
          </p>
          <div className={layout.row}>
            {POLICY_KEYS.map((k) => (
              <Field
                key={k}
                label={t(`security.policy.fields.${k}`)}
                hint={t('aiAdmin.form.range', {
                  min: POLICY_RANGES[k][0],
                  max: POLICY_RANGES[k][1],
                })}
                error={errors[k]}
              >
                {(p) => (
                  <input
                    {...p}
                    type="number"
                    min={POLICY_RANGES[k][0]}
                    max={POLICY_RANGES[k][1]}
                    value={Number.isNaN(v[k]) ? '' : v[k]}
                    onChange={(e) =>
                      setV((x) => ({
                        ...x,
                        [k]: e.target.value === '' ? Number.NaN : Number(e.target.value),
                      }))
                    }
                  />
                )}
              </Field>
            ))}
          </div>
          <Checkbox
            checked={v.requireMixedCharacters}
            onChange={(on) => setV((x) => ({ ...x, requireMixedCharacters: on }))}
          >
            {t('security.policy.fields.requireMixedCharacters')}
          </Checkbox>
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
              {t('aiAdmin.form.save', { v: policy.version + 1 })}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

export function SessionsCard() {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const canManage = usePermission('security.manage');
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const [target, setTarget] = useState<AuthSession | null>(null);
  return (
    <Card title={t('security.sessions.title')} caption={t('security.sessions.caption')} flush>
      <QueryView query={sessions}>
        {(list) => (
          <TableRegion label={t('security.sessions.title')}>
            <thead>
              <tr>
                <th scope="col">{t('security.sessions.user')}</th>
                <th scope="col">{t('security.sessions.kind')}</th>
                <th scope="col">{t('security.sessions.client')}</th>
                <th scope="col">{t('security.sessions.lastSeen')}</th>
                <th scope="col">{t('security.sessions.expires')}</th>
                <th scope="col">
                  <span className="visually-hidden">{t('common.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td>
                    <bdi>{s.username}</bdi>{' '}
                    {s.current && <Badge tone="accent">{t('security.sessions.current')}</Badge>}
                  </td>
                  <td>
                    <Badge tone={s.kind === 'demo_launch_code' ? 'mock' : 'neutral'}>
                      {t(`security.sessions.kinds.${s.kind}`)}
                    </Badge>
                  </td>
                  <td className={tableStyles.wrap}>
                    {s.client} · <bdi>{s.ipMasked}</bdi>
                  </td>
                  <td className={tableStyles.muted}>
                    <bdi>{fmt.dateTime(s.lastSeenAt)}</bdi>
                  </td>
                  <td className={tableStyles.muted}>
                    <bdi>{fmt.dateTime(s.expiresAt)}</bdi>
                  </td>
                  <td>
                    {canManage && !s.current && (
                      <Button variant="ghost" size="sm" onClick={() => setTarget(s)}>
                        {t('security.sessions.revoke')}
                        <span className="visually-hidden"> — {s.username}</span>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableRegion>
        )}
      </QueryView>
      {target && (
        <ConfirmDialog
          title={t('security.sessions.revokeTitle', { user: target.username })}
          confirmLabel={t('security.sessions.revoke')}
          onClose={() => setTarget(null)}
          onConfirm={async () => {
            await revoke.mutate(target.id);
            toast('success', t('security.sessions.revoked', { user: target.username }));
            setTarget(null);
          }}
        >
          <p>{t('security.sessions.revokeBody')}</p>
        </ConfirmDialog>
      )}
    </Card>
  );
}

export function LockoutsCard() {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const canManage = usePermission('users.manage');
  const users = useUsers();
  const action = useUserAction();
  return (
    <Card title={t('security.lockouts.title')} caption={t('security.lockouts.caption')}>
      <QueryView query={users}>
        {(list) => {
          const locked = list.filter((u) => u.locked);
          return locked.length === 0 ? (
            <EmptyState title={t('security.lockouts.empty')} />
          ) : (
            <ul className={layout.stack} aria-label={t('security.lockouts.title')}>
              {locked.map((u) => (
                <li key={u.id} className={layout.actions}>
                  <span>
                    <strong>{u.displayName}</strong> · <bdi>{u.username}</bdi> —{' '}
                    {t('security.lockouts.detail', {
                      n: u.failedAttempts,
                      until: u.lockedUntil ? fmt.dateTime(u.lockedUntil) : '—',
                    })}
                  </span>
                  {canManage && (
                    <Button
                      size="sm"
                      icon="lock"
                      onClick={async () => {
                        try {
                          await action.mutate({ kind: 'unlock', user: u });
                          toast('success', t('users.actions.unlock.done', { name: u.displayName }));
                        } catch (err) {
                          toast('error', describeError(err, t));
                        }
                      }}
                    >
                      {t('users.actions.unlock.short')}
                      <span className="visually-hidden"> — {u.displayName}</span>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          );
        }}
      </QueryView>
    </Card>
  );
}

export function SecurityEventsCard() {
  const { t } = useI18n();
  const events = useSecurityEvents();
  return (
    <Card title={t('security.events.title')} caption={t('security.events.caption')}>
      <AuditTrail query={events} limit={8} />
    </Card>
  );
}

/** How forgotten passwords and lost authenticators are recovered (backend-enforced). */
export function RecoveryWorkflowCard() {
  const { t } = useI18n();
  return (
    <Card title={t('security.recovery.title')} caption={t('security.recovery.caption')}>
      <div className={layout.grid}>
        <div>
          <h3>{t('security.recovery.passwordTitle')}</h3>
          <ol className={layout.list}>
            {(['p1', 'p2', 'p3', 'p4'] as const).map((k) => (
              <li key={k}>{t(`security.recovery.steps.${k}`)}</li>
            ))}
          </ol>
        </div>
        <div>
          <h3>{t('security.recovery.mfaTitle')}</h3>
          <ol className={layout.list}>
            {(['m1', 'm2', 'm3', 'm4'] as const).map((k) => (
              <li key={k}>{t(`security.recovery.steps.${k}`)}</li>
            ))}
          </ol>
        </div>
      </div>
    </Card>
  );
}
