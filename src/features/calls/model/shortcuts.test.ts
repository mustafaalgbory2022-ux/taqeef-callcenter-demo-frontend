import { describe, expect, it } from 'vitest';
import { isTypingTarget, playerShortcut, type ShortcutEvent } from './shortcuts';

const ev = (code: string, over: Partial<ShortcutEvent> = {}): ShortcutEvent => ({
  code,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  repeat: false,
  defaultPrevented: false,
  target: document.body,
  ...over,
});

describe('player shortcuts', () => {
  it('maps physical keys regardless of layout', () => {
    expect(playerShortcut(ev('KeyK'))).toBe('toggle');
    expect(playerShortcut(ev('KeyJ'))).toBe('back');
    expect(playerShortcut(ev('KeyL'))).toBe('forward');
    expect(playerShortcut(ev('KeyP'))).toBe('focus');
    expect(playerShortcut(ev('KeyX'))).toBeNull();
    expect(playerShortcut(ev('Space'))).toBeNull();
  });

  it('leaves browser, assistive-technology and handled key presses alone', () => {
    for (const mod of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey'] as const) {
      expect(playerShortcut(ev('KeyK', { [mod]: true }))).toBeNull();
    }
    expect(playerShortcut(ev('KeyK', { defaultPrevented: true }))).toBeNull();
    expect(playerShortcut(ev('KeyK', { repeat: true }))).toBeNull();
    expect(playerShortcut(ev('KeyL', { repeat: true }))).toBe('forward');
  });

  it('never fires while typing or inside dialogs', () => {
    const search = document.createElement('input');
    search.type = 'search';
    const range = document.createElement('input');
    range.type = 'range';
    const area = document.createElement('textarea');
    const select = document.createElement('select');
    const dialog = document.createElement('dialog');
    const inDialog = document.createElement('button');
    dialog.append(inDialog);
    document.body.append(dialog);
    expect(isTypingTarget(search)).toBe(true);
    expect(isTypingTarget(area)).toBe(true);
    expect(isTypingTarget(select)).toBe(true);
    expect(isTypingTarget(inDialog)).toBe(true);
    expect(isTypingTarget(range)).toBe(false);
    expect(playerShortcut(ev('KeyK', { target: search }))).toBeNull();
    expect(playerShortcut(ev('KeyK', { target: range }))).toBe('toggle');
    dialog.remove();
  });
});
