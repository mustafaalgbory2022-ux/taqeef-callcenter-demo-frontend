import type { Language } from '@/shared/types/domain';
import { floorTo2, hundredthsParts } from '@/shared/utils/score';

/** Western digits by default — switch to 'arab' here if the local project requires Arabic-Indic digits. */
export const NUMBERING_SYSTEM = 'latn';

const locale = (lang: Language) => (lang === 'ar' ? 'ar-IQ' : 'en-GB');

export function createFormatters(lang: Language) {
  const nf = (min: number, max: number) =>
    new Intl.NumberFormat(locale(lang), {
      numberingSystem: NUMBERING_SYSTEM,
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    });
  const integer = nf(0, 0);
  const twoDp = nf(2, 2);
  const decimal = twoDp.formatToParts(1.5).find((p) => p.type === 'decimal')?.value ?? '.';
  /** "6.99" from 699, built from integer parts only (localized digits and separator). */
  const fromHundredths = (d: number) => {
    const { whole, fraction } = hundredthsParts(d);
    const frac = [...fraction].map((c) => integer.format(Number(c))).join('');
    return `${integer.format(whole)}${decimal}${frac}`;
  };
  const date = new Intl.DateTimeFormat(locale(lang), {
    numberingSystem: NUMBERING_SYSTEM,
    dateStyle: 'medium',
  });
  const dateTime = new Intl.DateTimeFormat(locale(lang), {
    numberingSystem: NUMBERING_SYSTEM,
    dateStyle: 'medium',
    timeStyle: 'short',
    // 24-hour clock in both languages (Arabic locales default to 12-hour with ص/م).
    hourCycle: 'h23',
  });

  return {
    integer: (v: number) => integer.format(v),
    /**
     * Evaluation scores from the backend's integer `display_hundredths` (contract v0.1 3.4):
     * truncated, never rounded, no float arithmetic.
     */
    hundredths: fromHundredths,
    /** Signed difference of two `display_hundredths` values, e.g. +0.21 / −1.50. */
    hundredthsDelta: (from: number, to: number) => {
      const d = to - from;
      const sign = d > 0 ? '+' : d < 0 ? '−' : '±';
      return `${sign}${fromHundredths(Math.abs(d))}`;
    },
    /**
     * Non-score values on the 0–10 scale (configured thresholds, criterion figures labelled
     * "normalized"): two decimals, rounded down. Never used for evaluation scores.
     */
    score: (v: number) => twoDp.format(floorTo2(v)),
    date: (iso: string) => date.format(new Date(iso)),
    dateTime: (iso: string) => dateTime.format(new Date(iso)),
  };
}

export type Formatters = ReturnType<typeof createFormatters>;
