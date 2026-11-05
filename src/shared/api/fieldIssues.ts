import { ApiError, type FieldIssue } from './errors';

/**
 * Split server validation issues into those that map onto known form fields and the rest,
 * so nothing is silently dropped. Messages are produced by `describe` (localised UI text);
 * server text is never shown.
 */
export function mapFieldIssues<F extends string>(
  error: unknown,
  fieldMap: Readonly<Record<string, F>>,
  describe: (issue: FieldIssue) => string,
): { fields: Partial<Record<F, string>>; unmapped: string[] } | null {
  if (!(error instanceof ApiError) || error.fieldIssues.length === 0) return null;
  const fields: Partial<Record<F, string>> = {};
  const unmapped: string[] = [];
  for (const issue of error.fieldIssues) {
    const target = fieldMap[issue.field];
    if (target) fields[target] = describe(issue);
    else unmapped.push(describe(issue));
  }
  return { fields, unmapped };
}
