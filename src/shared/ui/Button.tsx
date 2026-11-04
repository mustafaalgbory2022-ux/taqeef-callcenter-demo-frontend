import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Icon, type IconName } from './Icon';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface CommonProps {
  variant?: Variant;
  size?: 'sm' | 'md';
  icon?: IconName | undefined;
  children: ReactNode;
}

const classes = (variant: Variant, size: 'sm' | 'md', extra?: string) =>
  [styles.button, styles[variant], size === 'sm' ? styles.sm : '', extra ?? ''].join(' ');

export interface ButtonProps
  extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  loading?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  children,
  className,
  disabled,
  type = 'button',
  onClick,
  ...rest
}: ButtonProps) {
  // While loading the button stays focusable (aria-disabled, clicks ignored) so keyboard focus
  // is not lost to <body> as it would be with the native disabled attribute (WCAG 2.4.3).
  return (
    <button
      type={type}
      className={classes(variant, size, className)}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={(e) => {
        if (loading) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...rest}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        icon && <Icon name={icon} />
      )}
      {children}
    </button>
  );
}

export function LinkButton({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className,
  ...rest
}: CommonProps & LinkProps) {
  return (
    <Link className={classes(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </Link>
  );
}
