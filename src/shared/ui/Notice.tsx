import type { ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './Notice.module.css';

export interface NoticeProps {
  tone?: 'info' | 'warning' | 'mock' | 'danger';
  title?: string | undefined;
  children?: ReactNode;
  testId?: string | undefined;
}

export function Notice({ tone = 'info', title, children, testId }: NoticeProps) {
  return (
    <div className={`${styles.notice} ${styles[tone]}`} data-testid={testId}>
      <span className={styles.icon}>
        <Icon name={tone === 'info' ? 'info' : 'alert'} />
      </span>
      <div>
        {title && <p className={styles.title}>{title}</p>}
        {children && <div className={styles.body}>{children}</div>}
      </div>
    </div>
  );
}
