/**
 * Audio-player keyboard shortcuts for the call review page.
 *
 * - Keys are matched on `KeyboardEvent.code` (physical key), so they work the same on English
 *   and Arabic keyboard layouts.
 * - No modifier combinations: Ctrl/Meta/Alt shortcuts belong to the browser and assistive
 *   technology, and Alt+Shift switches the input language on Windows.
 * - Ignored while typing (inputs, textareas, selects, contenteditable — e.g. transcript
 *   search) and inside dialogs. Screen readers in browse mode handle letters themselves.
 * - J/L follow the media timeline, which stays left-to-right in both languages.
 */
export type PlayerAction = 'toggle' | 'back' | 'forward' | 'focus';

export const PLAYER_SHORTCUTS: Readonly<Record<PlayerAction, { code: string; key: string }>> = {
  toggle: { code: 'KeyK', key: 'K' },
  back: { code: 'KeyJ', key: 'J' },
  forward: { code: 'KeyL', key: 'L' },
  focus: { code: 'KeyP', key: 'P' },
};

const BY_CODE: ReadonlyMap<string, PlayerAction> = new Map(
  (Object.entries(PLAYER_SHORTCUTS) as [PlayerAction, { code: string }][]).map(([a, s]) => [
    s.code,
    a,
  ]),
);

export interface ShortcutEvent {
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  defaultPrevented: boolean;
  target: EventTarget | null;
}

/** True for elements where letters are text input or the element owns the keys. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('dialog, [contenteditable=""], [contenteditable="true"]')) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    // Buttons, checkboxes, radios and the seek slider take no text.
    return !['button', 'checkbox', 'radio', 'range', 'reset', 'submit', 'color', 'file'].includes(
      target.type,
    );
  }
  return false;
}

/** The player action for a key press, or null when the press must be left alone. */
export function playerShortcut(e: ShortcutEvent): PlayerAction | null {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return null;
  if (isTypingTarget(e.target)) return null;
  const action = BY_CODE.get(e.code) ?? null;
  // Holding K must not flicker play/pause; holding J/L keeps seeking.
  if (action && e.repeat && (action === 'toggle' || action === 'focus')) return null;
  return action;
}
