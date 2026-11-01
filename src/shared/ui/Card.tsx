import { useId, type ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps {
  title: string;
  caption?: ReactNode;
  actions?: ReactNode;
  /** Remove body padding (tables, lists that manage their own spacing). */
  flush?: boolean;
  children: ReactNode;
}

export function Card({ title, caption, actions, flush, children }: CardProps) {
  const id = useId();
  return (
    <section className={styles.card} aria-labelledby={id}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title} id={id}>
            {title}
          </h2>
          {caption && <p className={styles.caption}>{caption}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      <div className={flush ? undefined : styles.body}>{children}</div>
    </section>
  );
}
