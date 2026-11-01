/** Minimal, typed form-validation helpers shared by all management forms. */

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/** Error values are i18n message keys so validation stays language-independent. */
export function hasErrors<K extends string>(errors: FieldErrors<K>): boolean {
  return Object.values(errors).some(Boolean);
}

export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

export const EXTENSION_PATTERN = /^[A-Za-z0-9-]{2,20}$/;
export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
