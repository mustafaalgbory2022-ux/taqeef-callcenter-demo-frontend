import { useState } from 'react';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { DeliveryKind } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { EmptyState, QueryView } from '@/shared/ui/States';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { useDeliveries } from '../hooks/useNotifications';

/** Immutable delivery history. Every record in mock mode is simulated — nothing was sent. */
export function DeliveriesCard() {
  const { t, fmt } = useI18n();
  const [kind, setKind] = useState<DeliveryKind | ''>('');
  const deliveries = useDeliveries(kind || undefined);
  return (
    <Card
      title={t('notifications.deliveries.title')}
      caption={t('notifications.deliveries.caption')}
      flush
    >
      <div className={layout.toolbar}>
        <Field label={t('notifications.deliveries.filter')}>
          {(p) => (
            <select
              {...p}
              value={kind}
              onChange={(e) => setKind(e.target.value as DeliveryKind | '')}
            >
              <option value="">{t('notifications.deliveries.all')}</option>
              {(['test', 'low_quality_alert', 'management_report'] as const).map((k) => (
                <option key={k} value={k}>
                  {t(`notifications.deliveries.kinds.${k}`)}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <QueryView query={deliveries}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState title={t('notifications.deliveries.empty')} />
          ) : (
            <TableRegion label={t('notifications.deliveries.title')}>
              <thead>
                <tr>
                  <th scope="col">{t('notifications.deliveries.at')}</th>
                  <th scope="col">{t('notifications.deliveries.kind')}</th>
                  <th scope="col">{t('notifications.templates.subject')}</th>
                  <th scope="col">{t('notifications.rules.recipients')}</th>
                  <th scope="col">{t('notifications.deliveries.status')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id}>
                    <td className={tableStyles.muted}>
                      <bdi>{fmt.dateTime(d.at)}</bdi>
                    </td>
                    <td>{t(`notifications.deliveries.kinds.${d.kind}`)}</td>
                    <td className={tableStyles.wrap} dir="auto">
                      {d.subject}
                    </td>
                    <td className={tableStyles.wrap}>
                      <bdi>{d.recipients.join(', ') || '—'}</bdi>
                    </td>
                    <td className={tableStyles.wrap}>
                      <Badge
                        tone={
                          d.status === 'failed'
                            ? 'danger'
                            : d.status === 'simulated'
                              ? 'mock'
                              : 'success'
                        }
                      >
                        {t(`notifications.deliveries.statuses.${d.status}`)}
                      </Badge>
                      <div className={tableStyles.muted}>{d.detail}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableRegion>
          )
        }
      </QueryView>
    </Card>
  );
}
