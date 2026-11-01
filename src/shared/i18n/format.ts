import type { Language } from '@/shared/types/domain';
import { floorTo2 } from '@/shared/utils/score';

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
  const date = new Intl.DateTimeFormat(locale(lang), {
    numberingSystem: NUMBERING_SYSTEM,
    dateStyle: 'medium',
  });
  const dateTime = new Intl.DateTimeFormat(locale(lang), {
    numberingSystem: NUMBERING_SYSTEM,
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return {
    integer: (v: number) => integer.format(v),
    /** Scores: two decimals, always rounded down. */
    score: (v: number) => twoDp.format(floorTo2(v)),
    /** Signed difference between two scores, e.g. +0.21 / −1.50 (each floored first). */
    scoreDelta: (from: number, to: number) => {
      const d = Math.round((floorTo2(to) - floorTo2(from)) * 100) / 100;
      const sign = d > 0 ? '+' : d < 0 ? '−' : '±';
      return `${sign}${twoDp.format(Math.abs(d))}`;
    },
    date: (iso: string) => date.format(new Date(iso)),
    dateTime: (iso: string) => dateTime.format(new Date(iso)),
  };
}

export type Formatters = ReturnType<typeof createFormatters>;
