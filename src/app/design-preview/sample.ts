/**
 * SYNTHETIC sample content for the Phase 0 design preview only.
 * No real customers, agents or recordings. Replaced by fixtures + MSW in Phase 2.
 */
import type { LocalizedText, ScorecardCriterion, TranscriptSegment } from '@/api/contract';

export const TARGET = 7;

export const criteria: (ScorecardCriterion & { avg: number; key: string })[] = [
  { id: 'c1', key: 'greeting', weight: 1, avg: 9.0 },
  { id: 'c2', key: 'discovery', weight: 2, avg: 7.5 },
  { id: 'c3', key: 'resolution', weight: 3, avg: 6.4 },
  { id: 'c4', key: 'compliance', weight: 2, avg: 4.6 },
  { id: 'c5', key: 'courtesy', weight: 1, avg: 8.6 },
].map((c) => ({ ...c, label: { en: c.key, ar: c.key }, anchors: [] }));

export interface SampleCall {
  id: string;
  topic: LocalizedText;
  agent: string;
  durationMs: number;
  score: number;
}

export const calls: SampleCall[] = [
  {
    id: 'DEMO-001',
    topic: { en: 'Billing inquiry', ar: 'استفسار عن الفاتورة' },
    agent: 'AG-01',
    durationMs: 252_000,
    score: 8.1,
  },
  {
    id: 'DEMO-002',
    topic: { en: 'Service activation', ar: 'تفعيل خدمة' },
    agent: 'AG-02',
    durationMs: 318_000,
    score: 7.3,
  },
  {
    id: 'DEMO-003',
    topic: { en: 'Billing dispute', ar: 'اعتراض على فاتورة' },
    agent: 'AG-01',
    durationMs: 441_000,
    score: 5.2,
  },
  {
    id: 'DEMO-004',
    topic: { en: 'Technical support', ar: 'دعم فني' },
    agent: 'AG-03',
    durationMs: 389_000,
    score: 6.6,
  },
  {
    id: 'DEMO-005',
    topic: { en: 'Plan change', ar: 'تغيير الباقة' },
    agent: 'AG-02',
    durationMs: 205_000,
    score: 6.8,
  },
];

export const transcript: (TranscriptSegment & { evidence?: LocalizedText })[] = [
  {
    id: 's1',
    startMs: 4_000,
    endMs: 10_000,
    speaker: 'agent',
    language: 'ar',
    text: 'مرحبًا بك في خدمة العملاء، معك موظف الخدمة. كيف أقدر أساعدك؟',
  },
  {
    id: 's2',
    startMs: 11_000,
    endMs: 18_000,
    speaker: 'customer',
    language: 'ar',
    text: 'أريد الاستفسار عن فاتورة الشهر الماضي، المبلغ أعلى من المعتاد.',
  },
  {
    id: 's3',
    startMs: 19_000,
    endMs: 25_000,
    speaker: 'agent',
    language: 'ar',
    text: 'أكيد، ممكن رقم الحساب لو سمحت؟',
    evidence: {
      en: 'Account details requested before the call-recording notice was given.',
      ar: 'طُلبت بيانات الحساب قبل إبلاغ العميل بتسجيل المكالمة.',
    },
  },
  {
    id: 's4',
    startMs: 26_000,
    endMs: 31_000,
    speaker: 'customer',
    language: 'ar',
    text: 'نعم، الرقم ينتهي بـ 0000.',
  },
];
