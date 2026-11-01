import type { ReactNode } from 'react';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Icon, type IconName } from './Icon';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'mock';

export function Badge({
  tone = 'neutral',
  icon,
  children,
  title,
}: {
  tone?: BadgeTone;
  icon?: IconName | undefined;
  children: ReactNode;
  title?: string | undefined;
}) {
  return (
    <span className={`${styles.badge} ${tone === 'neutral' ? '' : styles[tone]}`} title={title}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}

/** Marks synthetic records. Every synthetic entity shown in the UI carries this. */
export function SyntheticBadge() {
  const { t } = useI18n();
  return <Badge tone="mock">{t('common.synthetic')}</Badge>;
}
