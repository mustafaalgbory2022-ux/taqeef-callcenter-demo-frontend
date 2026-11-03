import { useI18n } from '@/shared/i18n/I18nProvider';
import type { EmailStatus, MfaState, UserAccount } from '@/shared/types/domain';
import { Badge, SyntheticBadge, type BadgeTone } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { tableStyles, TableRegion } from '@/shared/ui/Table';

const EMAIL_TONE: Record<EmailStatus, BadgeTone> = {
  verified: 'success',
  verification_sent: 'warning',
  unverified: 'danger',
};
const MFA_TONE: Record<MfaState, BadgeTone> = {
  enrolled: 'success',
  pending: 'warning',
  not_enrolled: 'danger',
};

export type RowAction =
  'edit' | 'access' | 'status' | 'passwordReset' | 'mfaReset' | 'unlock' | 'verification';

export function UsersTable({
  users,
  currentUserId,
  canManage,
  canSecurity,
  onAction,
}: {
  users: readonly UserAccount[];
  currentUserId: string | null;
  canManage: boolean;
  canSecurity: boolean;
  onAction: (action: RowAction, user: UserAccount) => void;
}) {
  const { t, fmt } = useI18n();
  const btn = (action: RowAction, u: UserAccount, label: string) => (
    <Button variant="ghost" size="sm" onClick={() => onAction(action, u)}>
      {label}
      <span className="visually-hidden"> — {u.displayName}</span>
    </Button>
  );
  return (
    <TableRegion label={t('users.table.label')}>
      <thead>
        <tr>
          <th scope="col">{t('users.fields.displayName')}</th>
          <th scope="col">{t('users.fields.email')}</th>
          <th scope="col">{t('users.fields.role')}</th>
          <th scope="col">{t('users.table.account')}</th>
          <th scope="col">{t('users.table.mfa')}</th>
          <th scope="col">{t('users.table.lastLogin')}</th>
          <th scope="col">
            <span className="visually-hidden">{t('common.actions')}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id} data-testid={`user-${u.username}`}>
            <td className={tableStyles.wrap}>
              {u.displayName} {u.synthetic && <SyntheticBadge />}{' '}
              {u.id === currentUserId && <Badge tone="accent">{t('users.table.you')}</Badge>}
              <div className={tableStyles.mono}>
                <bdi>{u.username}</bdi>
              </div>
            </td>
            <td className={tableStyles.wrap}>
              <bdi>{u.email}</bdi>
              <div>
                <Badge tone={EMAIL_TONE[u.emailStatus]}>
                  {t(`users.emailStatus.${u.emailStatus}`)}
                </Badge>
              </div>
            </td>
            <td>{t(`users.roles.${u.role}`)}</td>
            <td className={tableStyles.wrap}>
              <Badge tone={u.status === 'active' ? 'success' : 'neutral'}>
                {t(`users.status.${u.status}`)}
              </Badge>{' '}
              {u.locked && (
                <Badge tone="danger" icon="lock">
                  {t('users.status.locked')}
                </Badge>
              )}
              {u.mustChangePassword && (
                <div className={tableStyles.muted}>{t('users.table.mustChange')}</div>
              )}
            </td>
            <td>
              <Badge tone={MFA_TONE[u.mfaState]}>{t(`users.mfa.${u.mfaState}`)}</Badge>
            </td>
            <td className={tableStyles.muted}>
              <bdi>{u.lastLoginAt ? fmt.dateTime(u.lastLoginAt) : '—'}</bdi>
            </td>
            <td>
              {btn('access', u, t('users.table.access'))}
              {canManage && (
                <>
                  {btn('edit', u, t('common.edit'))}
                  {btn(
                    'status',
                    u,
                    t(
                      u.status === 'active'
                        ? 'users.actions.disable.short'
                        : 'users.actions.enable.short',
                    ),
                  )}
                  {u.status === 'active' &&
                    btn('passwordReset', u, t('users.actions.passwordReset.short'))}
                  {u.emailStatus !== 'verified' &&
                    btn('verification', u, t('users.actions.verification.short'))}
                  {u.locked && btn('unlock', u, t('users.actions.unlock.short'))}
                </>
              )}
              {canSecurity &&
                u.id !== currentUserId &&
                u.mfaState !== 'not_enrolled' &&
                btn('mfaReset', u, t('users.actions.mfaReset.short'))}
            </td>
          </tr>
        ))}
      </tbody>
    </TableRegion>
  );
}
