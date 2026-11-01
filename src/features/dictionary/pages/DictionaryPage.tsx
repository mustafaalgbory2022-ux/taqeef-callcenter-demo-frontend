import { useState } from 'react';
import { useAdminAudit } from '@/shared/hooks/useAdminAudit';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePermission } from '@/shared/hooks/usePermission';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type {
  DictionaryEntry,
  DictionaryKind,
  DictionaryQuery,
  DictionaryStatus,
} from '@/shared/types/domain';
import { AuditTrail } from '@/shared/ui/AuditTrail';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryView } from '@/shared/ui/States';
import { CorrectionsCard } from '../components/Corrections';
import { EntriesTable } from '../components/EntriesTable';
import { EntryStatusDialog, EntryVersionsDialog } from '../components/EntryDialogs';
import { EntryFormDialog } from '../components/EntryFormDialog';
import { useAllEntries, useDictionaryEntries } from '../hooks/useDictionary';
import { DICTIONARY_KINDS } from '../model/dictionary';

type DialogState =
  | { kind: 'none' }
  | { kind: 'form'; entry: DictionaryEntry | null }
  | { kind: 'status'; entry: DictionaryEntry }
  | { kind: 'versions'; entry: DictionaryEntry };

/** Iraqi Arabic dictionary: dialect expressions, spelling variants and product terminology. */
export function DictionaryPage() {
  const { t } = useI18n();
  useDocumentTitle(t('dictionary.title'), t('app.title'));
  const canManage = usePermission('dictionary.manage');
  const [query, setQuery] = useState<DictionaryQuery>({});
  const [search, setSearch] = useState('');
  const entries = useDictionaryEntries({ ...query, search: search.trim() || undefined });
  const all = useAllEntries();
  const audit = useAdminAudit('dictionary', 'dictionary_entry');
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const close = () => setDialog({ kind: 'none' });

  return (
    <>
      <PageHeader
        eyebrow={t('nav.administration')}
        title={t('dictionary.title')}
        description={t('dictionary.description')}
        actions={
          canManage && (
            <Button
              variant="primary"
              icon="plus"
              onClick={() => setDialog({ kind: 'form', entry: null })}
            >
              {t('dictionary.add')}
            </Button>
          )
        }
      />
      <Notice tone="mock" title={t('dictionary.syntheticTitle')}>
        {t('dictionary.syntheticBody')}
      </Notice>
      {!canManage && <Notice tone="info" title={t('common.readOnly')} />}
      <Card
        title={t('dictionary.listTitle')}
        caption={entries.data && t('dictionary.listCaption', { n: entries.data.length })}
        flush
      >
        <div className={layout.toolbar} role="search">
          <Field label={t('dictionary.filters.search')}>
            {(p) => (
              <input
                {...p}
                type="search"
                dir="auto"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            )}
          </Field>
          <Field label={t('dictionary.fields.kind')}>
            {(p) => (
              <select
                {...p}
                value={query.kind ?? ''}
                onChange={(e) =>
                  setQuery((q) => ({
                    ...q,
                    kind: (e.target.value || undefined) as DictionaryKind | undefined,
                  }))
                }
              >
                <option value="">{t('dictionary.filters.allKinds')}</option>
                {DICTIONARY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`dictionary.kinds.${k}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t('dictionary.fields.status')}>
            {(p) => (
              <select
                {...p}
                value={query.status ?? ''}
                onChange={(e) =>
                  setQuery((q) => ({
                    ...q,
                    status: (e.target.value || undefined) as DictionaryStatus | undefined,
                  }))
                }
              >
                <option value="">{t('dictionary.filters.allStatuses')}</option>
                <option value="active">{t('dictionary.status.active')}</option>
                <option value="disabled">{t('dictionary.status.disabled')}</option>
              </select>
            )}
          </Field>
        </div>
        <QueryView query={entries}>
          {(list) => (
            <EntriesTable
              entries={list}
              canManage={canManage}
              onEdit={(entry) => setDialog({ kind: 'form', entry })}
              onStatus={(entry) => setDialog({ kind: 'status', entry })}
              onVersions={(entry) => setDialog({ kind: 'versions', entry })}
            />
          )}
        </QueryView>
      </Card>
      <CorrectionsCard />
      <Card title={t('dictionary.recent')} caption={t('admin.audit.caption')}>
        <AuditTrail query={audit} limit={8} />
      </Card>

      {dialog.kind === 'form' && (
        <EntryFormDialog entry={dialog.entry} entries={all.data ?? []} onClose={close} />
      )}
      {dialog.kind === 'status' && <EntryStatusDialog entry={dialog.entry} onClose={close} />}
      {dialog.kind === 'versions' && <EntryVersionsDialog entry={dialog.entry} onClose={close} />}
    </>
  );
}
