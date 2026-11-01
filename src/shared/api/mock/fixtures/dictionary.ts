import type { Decoded } from '../../decode';
import type {
  wireCorrection,
  wireDictionaryEntry,
  wireDictionaryVersion,
} from '../../wire/dictionary';
import { SUPERVISOR } from '../audit';

export type WireDictionaryEntry = Decoded<typeof wireDictionaryEntry>;
export type WireDictionaryVersion = Decoded<typeof wireDictionaryVersion>;
export type WireCorrection = Decoded<typeof wireCorrection>;

const AT = '2026-09-20T10:00:00+03:00';
const BY = 'Synthetic administrator';

const entry = (
  id: string,
  kind: WireDictionaryEntry['kind'],
  term: string,
  standard: string,
  meaning: string,
  variants: string[] = [],
  status: WireDictionaryEntry['status'] = 'active',
): WireDictionaryEntry => ({
  id,
  kind,
  term,
  variants,
  standard,
  meaning_en: meaning,
  notes: '',
  status,
  version: 1,
  updated_at: AT,
  updated_by: BY,
  synthetic: true,
});

/** SYNTHETIC starter dictionary: common Iraqi expressions and invented product terms. */
export const dictionaryEntries: WireDictionaryEntry[] = [
  entry('dict-1', 'dialect_expression', 'شكو ماكو', 'ما الأخبار؟', "What's new?", ['شكو']),
  entry('dict-2', 'dialect_expression', 'هسه', 'الآن', 'now', ['هسا', 'هسع']),
  entry('dict-3', 'dialect_expression', 'شلونك', 'كيف حالك', 'How are you?', ['شلونج', 'شلونكم']),
  entry('dict-4', 'dialect_expression', 'ماكو', 'لا يوجد', 'there is none'),
  entry('dict-5', 'dialect_expression', 'اكو', 'يوجد', 'there is'),
  entry(
    'dict-6',
    'dialect_expression',
    'عيوني',
    'بكل سرور',
    'gladly (lit. “my eyes”)',
    [],
    'disabled',
  ),
  entry('dict-7', 'spelling_variant', 'انترنيت', 'إنترنت', 'internet', ['انترنت', 'نت']),
  entry('dict-8', 'spelling_variant', 'راوتر', 'راوتر', 'router', ['روتر', 'راوتار']),
  entry(
    'dict-9',
    'product_term',
    'باقة سين',
    'باقة سين التجريبية',
    'Synthetic plan “SYN” (invented)',
    ['سين باقة'],
  ),
  entry(
    'dict-10',
    'product_term',
    'SYN-Fiber',
    'خدمة الألياف التجريبية',
    'Synthetic fibre service (invented)',
    ['سين فايبر', 'فايبر'],
  ),
];

export function initialVersions(e: WireDictionaryEntry): WireDictionaryVersion[] {
  return [
    {
      entry_id: e.id,
      version: 1,
      action: 'created',
      kind: e.kind,
      term: e.term,
      variants: e.variants,
      standard: e.standard,
      meaning_en: e.meaning_en,
      notes: e.notes,
      status: e.status,
      change_note: 'Synthetic starter dictionary.',
      changed_at: AT,
      changed_by: BY,
    },
  ];
}

const correction = (
  id: string,
  callId: string,
  segmentId: string | null,
  heard: string,
  proposed: string,
  kind: WireCorrection['kind'],
  status: WireCorrection['status'],
  at: string,
  review: Partial<WireCorrection> = {},
): WireCorrection => ({
  id,
  call_id: callId,
  segment_id: segmentId,
  heard,
  proposed,
  kind,
  proposed_by: SUPERVISOR,
  proposed_at: at,
  status,
  reviewed_by: null,
  reviewed_at: null,
  review_note: '',
  entry_id: null,
  synthetic: true,
  ...review,
});

export const corrections: WireCorrection[] = [
  correction(
    'corr-1',
    'DEMO-002',
    's2',
    'رواتر',
    'راوتر',
    'spelling_variant',
    'pending',
    '2026-10-30T12:10:00+03:00',
  ),
  correction(
    'corr-2',
    'DEMO-004',
    's3',
    'شلونچ',
    'شلونك',
    'dialect_expression',
    'pending',
    '2026-10-30T14:40:00+03:00',
  ),
  correction(
    'corr-3',
    'DEMO-001',
    's1',
    'انترنت',
    'انترنيت',
    'spelling_variant',
    'approved',
    '2026-10-21T09:05:00+03:00',
    {
      reviewed_by: BY,
      reviewed_at: '2026-10-21T11:00:00+03:00',
      review_note: 'Common spelling; already a variant.',
      entry_id: 'dict-7',
    },
  ),
  correction(
    'corr-4',
    'DEMO-003',
    's4',
    'باقه',
    'باقة سين',
    'product_term',
    'rejected',
    '2026-10-22T15:20:00+03:00',
    {
      reviewed_by: BY,
      reviewed_at: '2026-10-22T16:00:00+03:00',
      review_note: 'Generic word, not the product name.',
    },
  ),
];
