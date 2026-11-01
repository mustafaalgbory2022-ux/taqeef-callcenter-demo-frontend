import { useId, type ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './Field.module.css';

export interface ControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
  'aria-required': boolean | undefined;
  className: string;
}

export interface FieldProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean;
  /** Render prop so any native control gets correct label/description wiring. */
  children: (control: ControlProps) => ReactNode;
}

export function Field({ label, hint, error, required, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy,
        'aria-required': required || undefined,
        className: styles.control ?? '',
      })}
      {hint && (
        <span className={styles.hint} id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className={styles.error} id={errorId}>
          <Icon name="alert" size={14} />
          {error}
        </span>
      )}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
  describedBy,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  describedBy?: string | undefined;
  disabled?: boolean | undefined;
}) {
  const id = useId();
  return (
    <div className={styles.checkboxRow}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={describedBy}
        disabled={disabled}
      />
      <label htmlFor={id}>{children}</label>
    </div>
  );
}
