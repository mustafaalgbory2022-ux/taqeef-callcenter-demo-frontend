import { useState } from 'react';
import { combineQueries } from '@/shared/hooks/combineQueries';
import { useAdminAudit } from '@/shared/hooks/useAdminAudit';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePermission } from '@/shared/hooks/usePermission';
import { useSession } from '@/shared/hooks/useSession';
import { PERMISSIONS } from '@/shared/api/wire/session';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { UserAccount } from '@/shared/types/domain';
import { AuditTrail } from '@/shared/ui/AuditTrail';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { useToast } from '@/shared/ui/Toaster';
import { AccessDialog, ConfirmUserAction, MfaResetDialog } from '../components/UserDialogs';
import { UserFormDialog } from '../components/UserFormDialog';
import { UsersTable, type RowAction } from '../components/UsersTable';
import { useRoles, useUserAction, useUsers } from '../hooks/useUsers';
import { permissionMatrix, protectionFor } from '../model/users';

type DialogState = { kind: 'none' } | { kind: 'create' } | { kind: RowAction; user: UserAccount };

/** Accounts for administrators and read-only/export users. Agents never get accounts. */
export function UsersAdminPage() {
  const { t } = useI18n();
  useDocumentTitle(t('users.title'), t('app.title'));
  const toast = useToast();
  const session = useSession();
  const canManage = usePermission('users.manage');
  const canSecurity = usePermission('security.manage');
  const query = combineQueries([useUsers(), useRoles()] as const);
  const audit = useAdminAudit('users', 'user');
  const quick = useUserAction();
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const close = () => setDialog({ kind: 'none' });
  const [users, roles] = query.data ?? [[], []];

  async function onAction(action: RowAction, user: UserAccount) {
    if (action === 'unlock' || action === 'verification') {
      try {
        await quick.mutate({ kind: action, user });
        toast('success', t(`users.actions.${action}.done`, { name: user.displayName }));
      } catch (err) {
        toast('error', describeError(err, t));
      }
      return;
    }
    if (action === 'status' && user.status === 'active') {
      const reason = protectionFor(user, users, session.userId);
      if (reason) {
        toast('error', t(`users.protected.${reason}`));
        return;
      }
    }
    setDialog({ kind: action, user });
  }

  const roleLock = (u: UserAccount) => {
    const reason = protectionFor(u, users, session.userId);
    return reason ? t(`users.protected.${reason}`) : null;
  };

  return (
    <>
      <PageHeader
        eyebrow={t('nav.system')}
        title={t('users.title')}
        description={t('users.description')}
        actions={
          canManage && (
            <Button variant="primary" icon="plus" onClick={() => setDialog({ kind: 'create' })}>
              {t('users.add')}
            </Button>
          )
        }
      />
      <Notice tone="mock" title={t('users.syntheticTitle')}>
        {t('users.syntheticBody')}
      </Notice>
      {!canManage && <Notice tone="info" title={t('common.readOnly')} />}
      <Card
        title={t('users.listTitle')}
        caption={t('users.listCaption', {
          n: users.length,
          admins: users.filter((u) => u.role === 'admin' && u.status === 'active').length,
        })}
        flush
      >
        <QueryView query={query}>
          {([list]) => (
            <UsersTable
              users={list}
              currentUserId={session.userId}
              canManage={canManage}
              canSecurity={canSecurity}
              onAction={onAction}
            />
          )}
        </QueryView>
      </Card>
      <Card title={t('users.matrix.title')} caption={t('users.matrix.caption')} flush>
        <TableRegion label={t('users.matrix.title')}>
          <thead>
            <tr>
              <th scope="col">{t('users.matrix.permission')}</th>
              <th scope="col">{t('users.roles.admin')}</th>
              <th scope="col">{t('users.roles.viewer')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{t('users.access.readAll')}</th>
              <td>
                <Icon name="check" label={t('users.matrix.yes')} />
              </td>
              <td>
                <Icon name="check" label={t('users.matrix.yes')} />
              </td>
            </tr>
            {permissionMatrix(PERMISSIONS, roles).map((row) => (
              <tr key={row.permission}>
                <th scope="row" className={tableStyles.wrap}>
                  {t(`users.permissions.${row.permission}`)}{' '}
                  <bdi className={layout.mono}>{row.permission}</bdi>
                </th>
                {(['admin', 'viewer'] as const).map((r) => (
                  <td key={r}>
                    {row.roles[r] ? (
                      <Icon name="check" label={t('users.matrix.yes')} />
                    ) : (
                      <Icon name="minus" label={t('users.matrix.no')} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </TableRegion>
      </Card>
      <Card title={t('users.recent')} caption={t('admin.audit.caption')}>
        <AuditTrail query={audit} limit={8} />
      </Card>

      {dialog.kind === 'create' && (
        <UserFormDialog user={null} users={users} roleLocked={null} onClose={close} />
      )}
      {dialog.kind === 'edit' && (
        <UserFormDialog
          user={dialog.user}
          users={users}
          roleLocked={roleLock(dialog.user)}
          onClose={close}
        />
      )}
      {dialog.kind === 'access' && (
        <AccessDialog user={dialog.user} roles={roles} onClose={close} />
      )}
      {dialog.kind === 'status' && (
        <ConfirmUserAction
          action={{
            kind: 'status',
            user: dialog.user,
            status: dialog.user.status === 'active' ? 'disabled' : 'active',
          }}
          onClose={close}
        />
      )}
      {dialog.kind === 'passwordReset' && (
        <ConfirmUserAction action={{ kind: 'passwordReset', user: dialog.user }} onClose={close} />
      )}
      {dialog.kind === 'mfaReset' && <MfaResetDialog user={dialog.user} onClose={close} />}
    </>
  );
}
