/** Harakat, superscript alef and tatweel: ignored when comparing dictionary terms. */
const MARKS = /[ً-ْٰـ]/g;
const PUNCTUATION = /[؟?!.,،؛:"'«»()]/g;

export const ARABIC_LETTER = /[ء-ي]/;

/**
 * Comparison key for dictionary terms: removes diacritics and tatweel, unifies alef/yaa/taa
 * marbuta forms, punctuation and spacing, and lower-cases Latin text. Never shown to users.
 */
export function normalizeTerm(text: string): string {
  return text
    .normalize('NFC')
    .replace(MARKS, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(PUNCTUATION, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Split a comma/newline separated list (Arabic or Latin commas), trimmed and de-duplicated. */
export function splitList(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[,،\n]/)) {
    const value = part.trim();
    const key = normalizeTerm(value);
    if (value && !seen.has(key)) {
      seen.add(key);
      out.push(value);
    }
  }
  return out;
}
