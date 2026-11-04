import { useState, type FormEvent } from 'react';
import { focusFirstInvalid } from '@/shared/ui/focusInvalid';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { UserAccount, UserInput, UserRole } from '@/shared/types/domain';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { Checkbox, Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { useSaveUser } from '../hooks/useUsers';
import {
  emptyUserInput,
  sensitiveChanges,
  toUserInput,
  USER_SERVER_FIELD,
  validateUser,
  type UserField,
} from '../model/users';

export function UserFormDialog({
  user,
  users,
  roleLocked,
  onClose,
}: {
  user: UserAccount | null;
  users: readonly UserAccount[];
  /** Set when the role cannot change (own account or last administrator). */
  roleLocked: string | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const save = useSaveUser();
  const [v, setV] = useState<UserInput>(user ? toUserInput(user) : emptyUserInput);
  const [errors, setErrors] = useState<Partial<Record<UserField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [ack, setAck] = useState(false);
  const sensitive = sensitiveChanges(user, v);
  const needsAck = Boolean(sensitive.role || sensitive.email);
  const set = <K extends keyof UserInput>(k: K, value: UserInput[K]) =>
    setV((x) => ({ ...x, [k]: value }));

  async function submit(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    e.preventDefault();
    setFormError(null);
    const client = validateUser(v, users, user?.id ?? null);
    setErrors(Object.fromEntries(Object.entries(client).map(([k, key]) => [k, t(key)])));
    if (Object.keys(client).length > 0) {
      focusFirstInvalid(form);
      return;
    }
    if (needsAck && !ack) {
      setFormError(t('users.form.ackRequired'));
      return;
    }
    try {
      await save.mutate({ id: user?.id ?? null, input: v, confirm: needsAck && ack });
      toast(
        'success',
        t(user ? 'users.form.updated' : 'users.form.created', { name: v.displayName.trim() }),
      );
      onClose();
    } catch (err) {
      const mapped = mapFieldIssues(err, USER_SERVER_FIELD);
      if (mapped) setErrors(mapped.fields);
      focusFirstInvalid(form);
      if (!mapped || mapped.unmapped.length > 0)
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
    }
  }

  return (
    <Dialog
      open
      title={
        user ? t('users.form.editTitle', { name: user.displayName }) : t('users.form.createTitle')
      }
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit" form="user-form" loading={save.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} noValidate className={layout.form}>
        <div className={layout.row}>
          <Field label={t('users.fields.displayName')} required error={errors.displayName}>
            {(p) => (
              <input
                {...p}
                maxLength={80}
                value={v.displayName}
                onChange={(e) => set('displayName', e.target.value)}
              />
            )}
          </Field>
          <Field
            label={t('users.fields.username')}
            hint={t('users.form.usernameHint')}
            required
            error={errors.username}
          >
            {(p) => (
              <input
                {...p}
                dir="ltr"
                autoComplete="off"
                value={v.username}
                onChange={(e) => set('username', e.target.value)}
              />
            )}
          </Field>
        </div>
        <div className={layout.row}>
          <Field
            label={t('users.fields.email')}
            hint={t('users.form.emailHint')}
            required
            error={errors.email}
          >
            {(p) => (
              <input
                {...p}
                type="email"
                dir="ltr"
                autoComplete="off"
                value={v.email}
                onChange={(e) => set('email', e.target.value)}
              />
            )}
          </Field>
          <Field
            label={t('users.fields.role')}
            hint={roleLocked ?? t('users.form.roleHint')}
            error={errors.role}
          >
            {(p) => (
              <select
                {...p}
                value={v.role}
                disabled={Boolean(roleLocked)}
                onChange={(e) => set('role', e.target.value as UserRole)}
              >
                <option value="viewer">{t('users.roles.viewer')}</option>
                <option value="admin">{t('users.roles.admin')}</option>
              </select>
            )}
          </Field>
        </div>
        <Notice tone="info">{t('users.form.noAgents')}</Notice>
        {needsAck && (
          <Notice tone="warning" title={t('users.form.sensitiveTitle')}>
            <ul className={layout.list}>
              {sensitive.role && (
                <li>
                  {t('users.form.roleChange', {
                    from: t(`users.roles.${sensitive.role.from}`),
                    to: t(`users.roles.${sensitive.role.to}`),
                  })}
                </li>
              )}
              {sensitive.email && <li>{t('users.form.emailChange', sensitive.email)}</li>}
            </ul>
            <Checkbox checked={ack} onChange={setAck}>
              {t('users.form.ack')}
            </Checkbox>
          </Notice>
        )}
        {!user && <p className={layout.muted}>{t('users.form.createNote')}</p>}
      </form>
      {formError && <Notice tone="danger" title={formError} />}
    </Dialog>
  );
}
