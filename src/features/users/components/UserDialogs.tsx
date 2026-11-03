import { useState } from 'react';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { RoleDefinition, UserAccount } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Dialog } from '@/shared/ui/Dialog';
import { Checkbox, Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { MFA_RESET_REASON_MIN } from '@/shared/utils/securityRules';
import { useUserAction, type UserAction } from '../hooks/useUsers';
import { effectivePermissions } from '../model/users';

type Confirmable = Extract<UserAction, { kind: 'status' | 'passwordReset' }>;

/** Disable / enable / password reset — sensitive, so confirmed with an acknowledgement. */
export function ConfirmUserAction({
  action,
  onClose,
}: {
  action: Confirmable;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const mutation = useUserAction();
  const name = action.user.displayName;
  const key =
    action.kind === 'passwordReset'
      ? 'passwordReset'
      : action.status === 'disabled'
        ? 'disable'
        : 'enable';
  return (
    <ConfirmDialog
      title={t(`users.actions.${key}.title`, { name })}
      confirmLabel={t(`users.actions.${key}.confirm`)}
      tone={key === 'enable' ? 'primary' : 'danger'}
      acknowledge={
        key === 'enable'
          ? undefined
          : t(key === 'disable' ? 'users.actions.disable.ack' : 'users.actions.passwordReset.ack')
      }
      onClose={onClose}
      onConfirm={async () => {
        await mutation.mutate(action);
        toast('success', t(`users.actions.${key}.done`, { name }));
        onClose();
      }}
    >
      <p>{t(`users.actions.${key}.body`, { email: action.user.email })}</p>
    </ConfirmDialog>
  );
}

/** MFA reset (lost authenticator): reason required; never for your own account. */
export function MfaResetDialog({ user, onClose }: { user: UserAccount; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const mutation = useUserAction();
  const [reason, setReason] = useState('');
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    if (reason.trim().length < MFA_RESET_REASON_MIN) {
      setError(t('users.errors.reason', { n: MFA_RESET_REASON_MIN }));
      return;
    }
    try {
      await mutation.mutate({ kind: 'mfaReset', user, reason });
      toast('success', t('users.actions.mfaReset.done', { name: user.displayName }));
      onClose();
    } catch (err) {
      setError(describeError(err, t));
    }
  }

  return (
    <Dialog
      open
      title={t('users.actions.mfaReset.title', { name: user.displayName })}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="danger" loading={mutation.isPending} disabled={!ack} onClick={confirm}>
            {t('users.actions.mfaReset.confirm')}
          </Button>
        </>
      }
    >
      <div className={layout.form}>
        <p>{t('users.actions.mfaReset.body')}</p>
        <Field
          label={t('users.actions.mfaReset.reason')}
          hint={t('users.actions.mfaReset.reasonHint')}
          required
          error={error ?? undefined}
        >
          {(p) => (
            <textarea
              {...p}
              rows={2}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </Field>
        <Checkbox checked={ack} onChange={setAck}>
          {t('users.actions.mfaReset.ack')}
        </Checkbox>
      </div>
    </Dialog>
  );
}

/** Effective access: role permissions minus anything blocked by the account state. */
export function AccessDialog({
  user,
  roles,
  onClose,
}: {
  user: UserAccount;
  roles: readonly RoleDefinition[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const access = effectivePermissions(user, roles);
  return (
    <Dialog open title={t('users.access.title', { name: user.displayName })} onClose={onClose}>
      <div className={layout.stack} data-testid="effective-access">
        <p>
          <Badge tone={access.canSignIn ? 'success' : 'danger'}>
            {t(access.canSignIn ? 'users.access.canSignIn' : 'users.access.cannotSignIn')}
          </Badge>{' '}
          {t(`users.roles.${user.role}`)}
        </p>
        {access.blockers.length > 0 && (
          <ul className={layout.list}>
            {access.blockers.map((b) => (
              <li key={b}>{t(`users.access.blockers.${b}`)}</li>
            ))}
          </ul>
        )}
        <p className={layout.muted}>{t('users.access.readAll')}</p>
        {access.permissions.length === 0 ? (
          <Notice tone="warning" title={t('users.access.none')} />
        ) : (
          <ul className={layout.list}>
            {access.permissions.map((p) => (
              <li key={p}>
                {t(`users.permissions.${p}`)} <bdi className={layout.mono}>{p}</bdi>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
