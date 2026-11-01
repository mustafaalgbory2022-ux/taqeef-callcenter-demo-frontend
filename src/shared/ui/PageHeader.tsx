import { useEffect, useRef, type ReactNode } from 'react';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  title: string;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

/** The first page shown after load keeps the browser's natural focus order (skip link first). */
let initialPageShown = false;

/** Page title. Receives focus after navigation so screen readers announce the new page. */
export function PageHeader({ title, eyebrow, description, actions }: PageHeaderProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!initialPageShown) {
      initialPageShown = true;
      return;
    }
    ref.current?.focus({ preventScroll: true });
  }, [title]);
  return (
    <div className={styles.header}>
      <div>
        {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
        <h1 className={styles.title} ref={ref} tabIndex={-1}>
          {title}
        </h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
