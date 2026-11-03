import { HEX_COLOR_PATTERN } from './validation';

/** WCAG 2.x colour helpers for validating runtime brand colours. */

function channels(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/** Mix a colour towards black (amount < 0) or white (amount > 0). */
export function mix(hex: string, amount: number): string {
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  return `#${channels(hex)
    .map((c) =>
      Math.round(c + (target - c) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

export const isHexColor = (v: string) => HEX_COLOR_PATTERN.test(v);

/** Text drawn on the brand colour: white in the light theme, near-black in the dark theme. */
export const ON_PRIMARY = { light: '#ffffff', dark: '#111418' } as const;
export const MIN_CONTRAST = 4.5;
