import { useI18n } from '@/shared/i18n/I18nProvider';
import type { DictionaryEntry } from '@/shared/types/domain';
import { Badge, SyntheticBadge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/States';
import { tableStyles, TableRegion } from '@/shared/ui/Table';

export function EntriesTable({
  entries,
  canManage,
  onEdit,
  onStatus,
  onVersions,
}: {
  entries: readonly DictionaryEntry[];
  canManage: boolean;
  onEdit: (e: DictionaryEntry) => void;
  onStatus: (e: DictionaryEntry) => void;
  onVersions: (e: DictionaryEntry) => void;
}) {
  const { t, fmt } = useI18n();
  if (entries.length === 0) return <EmptyState title={t('dictionary.table.empty')} />;
  return (
    <TableRegion label={t('dictionary.table.label')}>
      <thead>
        <tr>
          <th scope="col">{t('dictionary.fields.term')}</th>
          <th scope="col">{t('dictionary.fields.kind')}</th>
          <th scope="col">{t('dictionary.fields.variants')}</th>
          <th scope="col">{t('dictionary.fields.standard')}</th>
          <th scope="col">{t('dictionary.fields.status')}</th>
          <th scope="col">{t('dictionary.table.version')}</th>
          <th scope="col">
            <span className="visually-hidden">{t('common.actions')}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id}>
            <td className={tableStyles.wrap}>
              <span lang="ar" dir="auto">
                <strong>{e.term}</strong>
              </span>{' '}
              {e.synthetic && <SyntheticBadge />}
              {e.meaningEn && (
                <div className={tableStyles.muted} lang="en" dir="ltr">
                  {e.meaningEn}
                </div>
              )}
            </td>
            <td>{t(`dictionary.kinds.${e.kind}`)}</td>
            <td className={tableStyles.wrap} lang="ar" dir="auto">
              {e.variants.join('، ') || '—'}
            </td>
            <td className={tableStyles.wrap} lang="ar" dir="auto">
              {e.standard}
            </td>
            <td>
              <Badge
                tone={e.status === 'active' ? 'success' : 'neutral'}
                icon={e.status === 'active' ? 'check' : 'minus'}
              >
                {t(`dictionary.status.${e.status}`)}
              </Badge>
            </td>
            <td className={tableStyles.muted}>
              <bdi>v{e.version}</bdi> · <bdi>{fmt.date(e.updatedAt)}</bdi>
            </td>
            <td>
              <Button variant="ghost" size="sm" icon="history" onClick={() => onVersions(e)}>
                {t('dictionary.versions.open')}
                <span className="visually-hidden"> — {e.term}</span>
              </Button>
              {canManage && (
                <>
                  <Button variant="ghost" size="sm" icon="edit" onClick={() => onEdit(e)}>
                    {t('common.edit')}
                    <span className="visually-hidden"> — {e.term}</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onStatus(e)}>
                    {t(
                      e.status === 'active'
                        ? 'dictionary.status.disable'
                        : 'dictionary.status.enable',
                    )}
                    <span className="visually-hidden"> — {e.term}</span>
                  </Button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </TableRegion>
  );
}
