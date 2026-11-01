import type { ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps {
  title: string;
  caption?: string;
  actions?: ReactNode;
  flush?: boolean;
  children: ReactNode;
  headingId?: string;
}

export function Card({ title, caption, actions, flush, children, headingId }: CardProps) {
  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title} id={headingId}>
            {title}
          </h2>
          {caption && <p className={styles.caption}>{caption}</p>}
        </div>
        {actions}
      </header>
      <div className={flush ? styles.flush : styles.body}>{children}</div>
    </section>
  );
}
