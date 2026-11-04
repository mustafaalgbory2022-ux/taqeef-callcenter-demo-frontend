/**
 * After a failed submit, move focus to the first invalid control (or the form-level alert) so
 * keyboard and screen-reader users land on the problem (WCAG 3.3.1, 2.4.3). Runs after React
 * has rendered the error state.
 */
export function focusFirstInvalid(form: HTMLElement | null): void {
  if (!form) return;
  window.setTimeout(() => {
    const scope = form.closest('dialog') ?? form.parentElement ?? form;
    const target =
      form.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      scope.querySelector<HTMLElement>('[role="alert"]');
    if (!target) return;
    if (!target.matches('input, select, textarea, button, [tabindex]')) target.tabIndex = -1;
    target.focus();
  }, 0);
}
