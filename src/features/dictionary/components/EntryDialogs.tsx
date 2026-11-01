import { useState } from 'react';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { DictionaryEntry } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { EmptyState, QueryView } from '@/shared/ui/States';
import { useToast } from '@/shared/ui/Toaster';
import { useEntryVersions, useSetEntryStatus } from '../hooks/useDictionary';

/** Disable or re-enable an entry. A reason is required; a new version is recorded. */
export function EntryStatusDialog({
  entry,
  onClose,
}: {
  entry: DictionaryEntry;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const mutation = useSetEntryStatus();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const disabling = entry.status === 'active';

  async function confirm() {
    if (note.trim().length < 3) {
      setError(t('dictionary.errors.required'));
      return;
    }
    try {
      await mutation.mutate({ id: entry.id, status: disabling ? 'disabled' : 'active', note });
      toast(
        'success',
        t(disabling ? 'dictionary.status.disabledToast' : 'dictionary.status.enabledToast', {
          term: entry.term,
        }),
      );
      onClose();
    } catch (err) {
      setError(describeError(err, t));
    }
  }

  return (
    <Dialog
      open
      title={t(disabling ? 'dictionary.status.disableTitle' : 'dictionary.status.enableTitle', {
        term: entry.term,
      })}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant={disabling ? 'danger' : 'primary'}
            loading={mutation.isPending}
            onClick={confirm}
          >
            {t(disabling ? 'dictionary.status.disable' : 'dictionary.status.enable')}
          </Button>
        </>
      }
    >
      <div className={layout.form}>
        <p>{t(disabling ? 'dictionary.status.disableBody' : 'dictionary.status.enableBody')}</p>
        <Field label={t('dictionary.fields.reason')} required error={error ?? undefined}>
          {(p) => (
            <input {...p} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
          )}
        </Field>
      </div>
    </Dialog>
  );
}

/** Immutable version history of one entry, newest first. */
export function EntryVersionsDialog({
  entry,
  onClose,
}: {
  entry: DictionaryEntry;
  onClose: () => void;
}) {
  const { t, fmt } = useI18n();
  const versions = useEntryVersions(entry.id);
  return (
    <Dialog open title={t('dictionary.versions.title', { term: entry.term })} onClose={onClose}>
      <Notice tone="info" title={t('dictionary.versions.immutable')} />
      <QueryView query={versions}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState title={t('admin.audit.empty')} />
          ) : (
            <ol className={layout.stack} aria-label={t('dictionary.versions.label')}>
              {list.map((v) => (
                <li key={v.version}>
                  <p>
                    <strong>
                      <bdi>v{v.version}</bdi>
                    </strong>{' '}
                    <Badge>{t(`admin.audit.actions.${v.action}`)}</Badge> · {v.changedBy} ·{' '}
                    <bdi>{fmt.dateTime(v.changedAt)}</bdi>
                  </p>
                  <dl className={layout.facts}>
                    <dt>{t('dictionary.fields.term')}</dt>
                    <dd lang="ar" dir="auto">
                      {v.term}
                    </dd>
                    <dt>{t('dictionary.fields.variants')}</dt>
                    <dd lang="ar" dir="auto">
                      {v.variants.join('، ') || '—'}
                    </dd>
                    <dt>{t('dictionary.fields.standard')}</dt>
                    <dd lang="ar" dir="auto">
                      {v.standard}
                    </dd>
                    <dt>{t('dictionary.fields.status')}</dt>
                    <dd>{t(`dictionary.status.${v.status}`)}</dd>
                    <dt>{t('dictionary.fields.changeNote')}</dt>
                    <dd>{v.changeNote}</dd>
                  </dl>
                </li>
              ))}
            </ol>
          )
        }
      </QueryView>
    </Dialog>
  );
}
