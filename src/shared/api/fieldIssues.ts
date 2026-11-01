import { ApiError } from './errors';

/**
 * Split server validation issues into those that map onto known form fields and the rest,
 * so nothing is silently dropped: unmapped issues are shown as a form-level error.
 */
export function mapFieldIssues<F extends string>(
  error: unknown,
  fieldMap: Readonly<Record<string, F>>,
): { fields: Partial<Record<F, string>>; unmapped: string[] } | null {
  if (!(error instanceof ApiError) || error.fieldIssues.length === 0) return null;
  const fields: Partial<Record<F, string>> = {};
  const unmapped: string[] = [];
  for (const issue of error.fieldIssues) {
    const field = fieldMap[issue.field];
    if (field) fields[field] = issue.message;
    else unmapped.push(issue.message);
  }
  return { fields, unmapped };
}
